import { prisma } from '@/lib/prisma'
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
