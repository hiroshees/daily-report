import Link from 'next/link'
import { ErrorView } from '@/components/common/error-view'
import { ReportPagination } from '@/components/reports/report-pagination'
import { ReportTable } from '@/components/reports/report-table'
import { Button } from '@/components/ui/button'
import { buildReportListHref } from '@/lib/report-list-params'
import type { ReportListQuery } from '@/schemas/report'
import { listReports } from '@/server/services/report-list'

type ReportResultsProps = {
  query: ReportListQuery
  isManager: boolean
  today: string
  /** 再読み込み用の、現在の一覧 URL */
  href: string
}

/** 一覧の取得と表示（Server Component）。Suspense の中で使う */
export async function ReportResults({ query, isManager, today, href }: ReportResultsProps) {
  let result: Awaited<ReturnType<typeof listReports>>
  try {
    result = await listReports(query, { isManager })
  } catch (error) {
    console.error('日報一覧の取得に失敗しました', error)
    return (
      <ErrorView
        title="日報一覧を取得できませんでした"
        message="時間をおいてもう一度お試しください。"
        action={
          <Button asChild>
            <Link href={href}>再読み込み</Link>
          </Button>
        }
      />
    )
  }

  const { data, pagination } = result
  const conditions = {
    start_date: query.start_date,
    end_date: query.end_date,
    sales_person_id:
      query.sales_person_id === undefined ? undefined : String(query.sales_person_id),
  }

  // 範囲外のページ（URL の手入力など）。0 件ではないので、1 ページ目へ戻る導線を出す
  if (data.length === 0 && pagination.total > 0) {
    return (
      <div className="text-muted-foreground space-y-3 py-10 text-center text-sm">
        <p>このページには日報がありません。</p>
        <Button asChild variant="outline" size="sm">
          <Link href={buildReportListHref(conditions)}>1ページ目へ戻る</Link>
        </Button>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        条件に一致する日報はありません。
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ReportTable reports={data} today={today} listHref={href} />
      <ReportPagination pagination={pagination} params={conditions} />
    </div>
  )
}
