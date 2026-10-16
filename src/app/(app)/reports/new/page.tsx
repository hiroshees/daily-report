import { redirect } from 'next/navigation'
import { ReportForm } from '@/components/reports/report-form'
import { todayInJst } from '@/lib/date'
import { requirePageUser } from '@/server/page-auth'
import { findReportIdByDate } from '@/server/services/report-list'

export default async function Page() {
  // レイアウトの確認に頼らず、ページでも確認する
  const user = await requirePageUser()
  const today = todayInJst()

  // 本日分が作成済みなら、重複エラーにならないよう既存の日報へ誘導する
  const existingId = await findReportIdByDate(user.id, today)
  if (existingId) redirect(`/reports/${existingId}`)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">日報作成</h1>
      <ReportForm reportDate={today} authorName={user.name} />
    </div>
  )
}
