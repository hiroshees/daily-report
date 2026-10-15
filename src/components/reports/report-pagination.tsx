import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { buildReportListHref, type ReportListParams } from '@/lib/report-list-params'

type ReportPaginationProps = {
  pagination: { total: number; page: number; per_page: number; total_pages: number }
  /** ページ以外の検索条件（リンクに引き継ぐ） */
  params: Omit<ReportListParams, 'page'>
}

export function ReportPagination({ pagination, params }: ReportPaginationProps) {
  const { total, page, total_pages } = pagination

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        全{total}件（{page} / {total_pages} ページ）
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildReportListHref({ ...params, page: page - 1 })} rel="prev">
              前へ
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            前へ
          </Button>
        )}
        {page < total_pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildReportListHref({ ...params, page: page + 1 })} rel="next">
              次へ
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            次へ
          </Button>
        )}
      </div>
    </nav>
  )
}
