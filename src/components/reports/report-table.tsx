import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatReportDate } from '@/lib/date'
import { withBack } from '@/lib/report-back'

export type ReportListRow = {
  id: number
  report_date: string
  sales_person: { id: number; name: string }
  visit_count: number
  has_comments: boolean
}

type ReportTableProps = {
  reports: ReportListRow[]
  /** 日付表示の基準日（YYYY-MM-DD）。年またぎ判定に使う */
  today: string
  /** 詳細画面から「戻る」ときの一覧 URL（検索条件・ページを保持する） */
  listHref?: string
}

export function ReportTable({ reports, today, listHref = '/reports' }: ReportTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日付</TableHead>
          <TableHead>営業担当</TableHead>
          <TableHead>顧客数</TableHead>
          <TableHead>状態</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell>
              <time dateTime={report.report_date}>
                {formatReportDate(report.report_date, today)}
              </time>
            </TableCell>
            <TableCell>{report.sales_person.name}</TableCell>
            <TableCell>{report.visit_count}件</TableCell>
            <TableCell>
              {/* TODO(#27): 「状態」の定義が未確定（A8）。暫定でコメントの有無を表示する */}
              <Badge variant={report.has_comments ? 'default' : 'outline'}>
                {report.has_comments ? 'コメントあり' : 'コメントなし'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link
                  href={withBack(`/reports/${report.id}`, listHref)}
                  aria-label={`${formatReportDate(report.report_date, today)} ${report.sales_person.name}の日報詳細`}
                >
                  詳細
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
