import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ReportCreateRequest, ReportUpdateRequest } from '@/schemas/report'
import { getReportEditLimitDays } from '@/server/env'
import { ApiError } from '@/server/errors'

const toIso = (date: Date) => date.toISOString().replace('.000Z', 'Z')

/** DB の time 型（1970-01-01 の UTC として返る）を `HH:mm` にする */
const toHourMinute = (time: Date) => time.toISOString().slice(11, 16)

/** 日報詳細。訪問記録・コメントも 1 クエリ（include）で取得する */
export async function getReport(id: number) {
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      salesPerson: { select: { id: true, name: true, email: true } },
      visits: {
        include: { customer: { select: { id: true, companyName: true } } },
        // 時刻の昇順（未入力は末尾）。同時刻は登録順
        orderBy: [{ visitTime: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      },
      comments: {
        include: { manager: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (!report) throw new ApiError('NOT_FOUND')

  return {
    id: report.id,
    report_date: report.reportDate.toISOString().slice(0, 10),
    sales_person: report.salesPerson,
    problem: report.problem,
    plan: report.plan,
    visits: report.visits.map((visit) => ({
      id: visit.id,
      customer: { id: visit.customer.id, company_name: visit.customer.companyName },
      visit_time: visit.visitTime ? toHourMinute(visit.visitTime) : null,
      visit_content: visit.visitContent,
    })),
    comments: report.comments.map((comment) => ({
      id: comment.id,
      manager: comment.manager,
      comment: comment.comment,
      created_at: toIso(comment.createdAt),
    })),
    created_at: toIso(report.createdAt),
    updated_at: toIso(report.updatedAt),
  }
}

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

/** `HH:mm` を DB の time 型用の Date にする（日付部分は無視される） */
const toTimeDate = (time: string) => new Date(`1970-01-01T${time}:00Z`)

// index が不明な場合（DB エラー経由）は visits 全体を指す
const customerNotFound = (index?: number) =>
  new ApiError('VALIDATION_ERROR', undefined, [
    {
      field: index === undefined ? 'visits' : `visits.${index}.customer_id`,
      message: '指定された顧客が存在しません',
    },
  ])

/** 訪問記録の顧客への外部キー違反か（日報の担当者など別の外部キー違反と区別する） */
const isCustomerForeignKeyError = (error: unknown) =>
  isPrismaError(error, 'P2003') &&
  (error as Prisma.PrismaClientKnownRequestError).meta?.constraint ===
    'visit_record_customer_id_fkey'

/** 存在しない顧客は DB エラーになる前に項目単位で返す（1 クエリで確認） */
async function assertCustomersExist(visits: { customer_id: number }[]) {
  const customerIds = [...new Set(visits.map((visit) => visit.customer_id))]
  const existing = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((customer) => customer.id))
  const missingIndex = visits.findIndex((visit) => !existingIds.has(visit.customer_id))
  if (missingIndex >= 0) throw customerNotFound(missingIndex)
}

/**
 * 日報と訪問記録を 1 トランザクションで作成する。
 * salesPersonId は認証済みユーザーから渡す（リクエストからは受け取らない）。
 * TODO(#27): 存在しない customer_id のエラー（現状 400）、作成可能日付（現状は制限なし）は未確定
 */
export async function createReport(salesPersonId: number, input: ReportCreateRequest) {
  await assertCustomersExist(input.visits)

  try {
    // ネストした create は 1 トランザクションで実行され、訪問記録の失敗時は日報もロールバックされる
    const report = await prisma.dailyReport.create({
      data: {
        salesPersonId,
        reportDate: new Date(input.report_date),
        problem: input.problem,
        plan: input.plan,
        visits: {
          create: input.visits.map((visit) => ({
            customerId: visit.customer_id,
            visitTime: visit.visit_time ? toTimeDate(visit.visit_time) : null,
            visitContent: visit.visit_content,
          })),
        },
      },
    })
    return {
      id: report.id,
      report_date: report.reportDate.toISOString().slice(0, 10),
      sales_person_id: report.salesPersonId,
      problem: report.problem,
      plan: report.plan,
      created_at: toIso(report.createdAt),
    }
  } catch (error) {
    // 同一担当者・同一日付の重複は DB のユニーク制約で検出して 409 にする（同時リクエストもここで防ぐ）
    if (isPrismaError(error, 'P2002')) throw new ApiError('DUPLICATE_REPORT')
    // 顧客の存在確認後に削除された場合のみ 400。それ以外の外部キー違反は握りつぶさず再 throw する
    if (isCustomerForeignKeyError(error)) throw customerNotFound()
    throw error
  }
}

const visitIdInvalid = (index: number, message: string) =>
  new ApiError('VALIDATION_ERROR', undefined, [{ field: `visits.${index}.id`, message }])

const DAY_MS = 24 * 60 * 60 * 1000

/** 本人の日報だけを操作対象にする。日報が無ければ 404、他人のものなら 403（管理者も同様） */
async function findOwnReport(tx: Prisma.TransactionClient, id: number, userId: number) {
  const report = await tx.dailyReport.findUnique({
    where: { id },
    select: { id: true, salesPersonId: true, createdAt: true },
  })
  if (!report) throw new ApiError('NOT_FOUND')
  if (report.salesPersonId !== userId) throw new ApiError('FORBIDDEN')
  return report
}

type VisitUpdateInput = ReportUpdateRequest['visits'][number]

const visitData = (visit: VisitUpdateInput) => ({
  customerId: visit.customer_id,
  visitTime: visit.visit_time ? toTimeDate(visit.visit_time) : null,
  visitContent: visit.visit_content,
})

/**
 * 日報と訪問記録を差分更新する（id あり=更新、id なし=新規、送られなかった既存分=削除）。
 * 日付と作成者は変更できない（スキーマに含めず、余分なキーは無視される）。
 * 読み取り・権限・期限・訪問記録 ID の検証から更新までを 1 トランザクションで行う。
 * TODO(#27): 編集可能期間は未確定のため、作成日時から REPORT_EDIT_LIMIT_DAYS 日（既定 7 日）で暫定判定している
 * TODO(#27): 楽観ロック（updated_at による同時編集の検出）は仕様変更になるため未実装。
 *   同時 PUT は後勝ち（既知の制約）。ただし検証と更新が同一トランザクションなので二重作成は起きにくい
 */
export async function updateReport(id: number, userId: number, input: ReportUpdateRequest) {
  // 顧客の存在確認はトランザクション外（最終的な整合性は外部キー制約が保証し、違反は下で 400 に変換する）
  await assertCustomersExist(input.visits)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const report = await findOwnReport(tx, id, userId)
      const limitMs = getReportEditLimitDays() * DAY_MS
      if (Date.now() - report.createdAt.getTime() > limitMs) {
        throw new ApiError('EDIT_PERIOD_EXPIRED')
      }

      // 既存の訪問記録 id は、この日報に属するものだけ指定できる（他日報の id 混入・重複指定は 400）
      const owned = await tx.visitRecord.findMany({
        where: { reportId: id },
        select: { id: true },
      })
      const ownedIds = new Set(owned.map((visit) => visit.id))
      const keptIds = new Set<number>()
      input.visits.forEach((visit, index) => {
        if (visit.id === undefined) return
        if (!ownedIds.has(visit.id)) throw visitIdInvalid(index, 'この日報の訪問記録ではありません')
        if (keptIds.has(visit.id)) throw visitIdInvalid(index, '訪問記録 ID が重複しています')
        keptIds.add(visit.id)
      })

      // updated_at は @updatedAt により更新のたびに自動で更新される
      const result = await tx.dailyReport.update({
        where: { id },
        data: { problem: input.problem, plan: input.plan },
      })
      await tx.visitRecord.deleteMany({ where: { reportId: id, id: { notIn: [...keptIds] } } })

      // トランザクション内の接続は 1 本でクエリは順番に実行されるが、await の待ち合わせを減らせる
      const existing = input.visits.filter((visit) => visit.id !== undefined)
      await Promise.all(
        existing.map((visit) =>
          tx.visitRecord.update({ where: { id: visit.id }, data: visitData(visit) }),
        ),
      )
      await tx.visitRecord.createMany({
        data: input.visits
          .filter((visit) => visit.id === undefined)
          .map((visit) => ({ reportId: id, ...visitData(visit) })),
      })
      return result
    })
    return {
      id: updated.id,
      report_date: updated.reportDate.toISOString().slice(0, 10),
      sales_person_id: updated.salesPersonId,
      problem: updated.problem,
      plan: updated.plan,
      updated_at: toIso(updated.updatedAt),
    }
  } catch (error) {
    // 検証後に日報・訪問記録が同時に削除された場合
    if (isPrismaError(error, 'P2025')) throw new ApiError('NOT_FOUND')
    if (isCustomerForeignKeyError(error)) throw customerNotFound()
    throw error
  }
}

/**
 * 日報を削除する（訪問記録・コメントは DB の Cascade で削除される）。本人のみ。
 * 存在・権限の確認と削除を 1 トランザクションで行う。
 * TODO(#27): 編集期限（EDIT_PERIOD_EXPIRED）を削除にも適用するかは未確定のため、現状は適用していない
 */
export async function deleteReport(id: number, userId: number) {
  try {
    await prisma.$transaction(async (tx) => {
      await findOwnReport(tx, id, userId)
      await tx.dailyReport.delete({ where: { id } })
    })
  } catch (error) {
    // 確認後に同時削除された場合は 404 に揃える
    if (isPrismaError(error, 'P2025')) throw new ApiError('NOT_FOUND')
    throw error
  }
}
