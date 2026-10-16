import Link from 'next/link'
import { CommentForm } from '@/components/reports/comment-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatFullDate, formatJstDateTime } from '@/lib/date'
import { withBack } from '@/lib/report-back'
import type { getReport } from '@/server/services/report'

type ReportDetailViewProps = {
  report: Awaited<ReturnType<typeof getReport>>
  /** ログインユーザー */
  user: { id: number; isManager: boolean }
  /** 「戻る」先の一覧 URL（検索条件つき） */
  backHref: string
}

/**
 * 日報詳細（SC005）。ユーザーが入力した文字列は、React が自動でエスケープして表示する
 * （HTML として解釈させない。dangerouslySetInnerHTML は使わない）。改行は whitespace-pre-wrap で保持する。
 */
export function ReportDetailView({ report, user, backHref }: ReportDetailViewProps) {
  const isOwner = report.sales_person.id === user.id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">日報詳細</h1>
        {/* 編集できるのは作成者本人のみ（管理者も他人の日報は不可）。編集画面側でもサーバーで検証する */}
        {isOwner && (
          <Button asChild variant="outline">
            <Link href={withBack(`/reports/${report.id}/edit`, backHref)}>編集</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-1 pt-6 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">日付：</span>
            <time dateTime={report.report_date}>{formatFullDate(report.report_date)}</time>
          </p>
          <p>
            <span className="text-muted-foreground">作成者：</span>
            {report.sales_person.name}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">訪問記録</CardTitle>
        </CardHeader>
        <CardContent>
          {report.visits.length === 0 ? (
            <p className="text-muted-foreground text-sm">訪問記録はありません</p>
          ) : (
            <ol className="space-y-4">
              {report.visits.map((visit, index) => (
                <li key={visit.id} className="text-sm">
                  <p className="font-medium">
                    {index + 1}. {visit.customer.company_name}
                    {/* 訪問時刻は任意。未入力なら表示しない */}
                    {visit.visit_time && `（${visit.visit_time}）`}
                  </p>
                  <p className="mt-1 pl-5 whitespace-pre-wrap">{visit.visit_content}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本日の課題・相談（Problem）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{report.problem}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">明日の計画（Plan）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{report.plan}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">上長コメント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.comments.length === 0 ? (
            <p className="text-muted-foreground text-sm">コメントはまだありません</p>
          ) : (
            <ul aria-label="上長コメント一覧" className="space-y-4">
              {report.comments.map((comment) => (
                <li key={comment.id} className="text-sm">
                  <p className="font-medium">
                    {comment.manager.name}（
                    <time dateTime={comment.created_at}>
                      {formatJstDateTime(comment.created_at)}
                    </time>
                    ）：
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.comment}</p>
                </li>
              ))}
            </ul>
          )}

          {/* コメントできるのは管理者のみ。API 側でも検証する */}
          {user.isManager && <CommentForm reportId={report.id} />}
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={backHref}>戻る</Link>
        </Button>
      </div>
    </div>
  )
}
