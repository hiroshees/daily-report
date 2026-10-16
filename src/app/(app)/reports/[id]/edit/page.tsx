import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ErrorView, ForbiddenView } from '@/components/common/error-view'
import { ReportForm } from '@/components/reports/report-form'
import { Button } from '@/components/ui/button'
import { IdParamSchema } from '@/schemas/common'
import { ApiError } from '@/server/errors'
import { requirePageUser } from '@/server/page-auth'
import { isReportEditExpired } from '@/server/report-edit-period'
import { getReport } from '@/server/services/report'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // レイアウトの確認に頼らず、ページでも確認する
  const user = await requirePageUser()

  const parsedId = IdParamSchema.safeParse(await params)
  if (!parsedId.success) notFound()

  let report: Awaited<ReturnType<typeof getReport>>
  try {
    report = await getReport(parsedId.data.id)
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  // 編集できるのは作成者本人のみ（管理者も他人の日報は不可）。URL 直打ちを防ぐため、サーバー側で必ず確認する
  if (report.sales_person.id !== user.id) return <ForbiddenView />

  // 更新 API も同じ判定で拒否する。ここでは入力させる前に案内する
  if (isReportEditExpired(new Date(report.created_at))) {
    return (
      <ErrorView
        title="この日報は編集できません"
        message="編集可能な期間を過ぎています"
        action={
          <Button asChild>
            <Link href={`/reports/${report.id}`}>日報詳細へ戻る</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">日報編集</h1>
      <ReportForm
        mode="edit"
        reportId={report.id}
        reportDate={report.report_date}
        authorName={report.sales_person.name}
        initialValues={{
          problem: report.problem,
          plan: report.plan,
          visits: report.visits.map((visit) => ({
            visit_id: visit.id,
            customer_id: visit.customer.id,
            visit_time: visit.visit_time ?? '',
            visit_content: visit.visit_content,
          })),
        }}
        customerLabels={Object.fromEntries(
          report.visits.map((visit) => [visit.customer.id, visit.customer.company_name]),
        )}
      />
    </div>
  )
}
