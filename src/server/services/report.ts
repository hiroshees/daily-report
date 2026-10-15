import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ReportCreateRequest } from '@/schemas/report'
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

const customerNotFound = (index: number) =>
  new ApiError('VALIDATION_ERROR', undefined, [
    { field: `visits.${index}.customer_id`, message: '指定された顧客が存在しません' },
  ])

/**
 * 日報と訪問記録を 1 トランザクションで作成する。
 * salesPersonId は認証済みユーザーから渡す（リクエストからは受け取らない）。
 * TODO(#27): 存在しない customer_id のエラー（現状 400）、作成可能日付（現状は制限なし）は未確定
 */
export async function createReport(salesPersonId: number, input: ReportCreateRequest) {
  // 存在しない顧客は DB エラーになる前に項目単位で返す（1 クエリで確認）
  const customerIds = [...new Set(input.visits.map((visit) => visit.customer_id))]
  const existing = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((customer) => customer.id))
  const missingIndex = input.visits.findIndex((visit) => !existingIds.has(visit.customer_id))
  if (missingIndex >= 0) throw customerNotFound(missingIndex)

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
    // 事前チェックをすり抜けた同時リクエストも DB のユニーク制約で 409 にする
    if (isPrismaError(error, 'P2002')) throw new ApiError('DUPLICATE_REPORT')
    // 事前チェック後に顧客が削除された場合
    if (isPrismaError(error, 'P2003')) throw customerNotFound(0)
    throw error
  }
}
