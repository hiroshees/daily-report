import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/session'
import type { ReportListQuery } from '@/schemas/report'
import { paginatedResult, toSkipTake } from '@/server/pagination'

/** `YYYY-MM-DD` を、DB の date 型と同じ「日付だけ」の値（UTC の 0 時）にする。実行環境のタイムゾーンに左右されない */
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
const toDateString = (date: Date) => date.toISOString().slice(0, 10)

/**
 * 日報の一覧（期間・担当者での絞り込み、ページネーション）。
 * 閲覧できるのは全員分（管理者も一般ユーザーも）。担当者での絞り込み（sales_person_id）は管理者のみ有効で、
 * 一般ユーザーが指定した場合は**無視して**全員分を返す（#27 で決定）。
 */
export async function listReports(query: ReportListQuery, user: Pick<SessionUser, 'isManager'>) {
  const where: Prisma.DailyReportWhereInput = {
    ...((query.start_date || query.end_date) && {
      reportDate: {
        ...(query.start_date && { gte: toDate(query.start_date) }),
        ...(query.end_date && { lte: toDate(query.end_date) }),
      },
    }),
    ...(user.isManager &&
      query.sales_person_id !== undefined && { salesPersonId: query.sales_person_id }),
  }

  // 件数と一覧は同じトランザクションで取得する。訪問記録の件数とコメントの有無は、
  // 行ごとに問い合わせず（N+1 を避け）、一覧と同じクエリの中で集計する
  const [total, rows] = await prisma.$transaction([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      orderBy: [{ reportDate: 'desc' }, { id: 'desc' }],
      ...toSkipTake(query),
      select: {
        id: true,
        reportDate: true,
        createdAt: true,
        salesPerson: { select: { id: true, name: true } },
        _count: { select: { visits: true, comments: true } },
      },
    }),
  ])

  const data = rows.map((report) => ({
    id: report.id,
    report_date: toDateString(report.reportDate),
    sales_person: report.salesPerson,
    visit_count: report._count.visits,
    has_comments: report._count.comments > 0,
    // ISO 8601（UTC、ミリ秒を常に含む）。値によって形式が変わらないよう、ミリ秒が 0 でも省略しない
    created_at: report.createdAt.toISOString(),
  }))

  return paginatedResult(data, total, query)
}

/** 指定した担当者・日付の日報 ID（なければ null）。一覧画面で「本日分は作成済みか」を判定するのに使う */
export async function findReportIdByDate(salesPersonId: number, date: string) {
  const report = await prisma.dailyReport.findFirst({
    where: { salesPersonId, reportDate: toDate(date) },
    select: { id: true },
  })
  return report?.id ?? null
}
