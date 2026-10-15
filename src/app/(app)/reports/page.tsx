import Link from 'next/link'
import { Suspense } from 'react'
import { ErrorView } from '@/components/common/error-view'
import { FormError } from '@/components/common/form-error'
import { ReportListSkeleton } from '@/components/reports/report-list-skeleton'
import { ReportPagination } from '@/components/reports/report-pagination'
import { ReportSearchForm } from '@/components/reports/report-search-form'
import { ReportTable } from '@/components/reports/report-table'
import { Button } from '@/components/ui/button'
import { todayInJst } from '@/lib/date'
import { buildReportListHref } from '@/lib/report-list-params'
import { ReportListQuerySchema } from '@/schemas/report'
import { requirePageUser } from '@/server/page-auth'
import { findReportIdByDate, listReports } from '@/server/services/report-list'
import { listSalesPersons } from '@/server/services/sales-person'

type SearchParams = Record<string, string | string[] | undefined>

/** 同じキーが複数あっても先頭だけを使う */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

async function fetchSalesPersons() {
  const { data } = await listSalesPersons({})
  return data
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // レイアウトの確認に頼らず、ページでも確認する
  const user = await requirePageUser()
  const raw = await searchParams

  // 空文字（未入力の検索条件）は未指定として扱う
  const params = {
    start_date: first(raw.start_date) || undefined,
    end_date: first(raw.end_date) || undefined,
    sales_person_id: first(raw.sales_person_id) || undefined,
    page: first(raw.page) || undefined,
  }
  const parsed = ReportListQuerySchema.safeParse(params)
  const today = todayInJst()

  // 営業担当の絞り込みは管理者のみ。一般ユーザーには選択肢を渡さない
  const [salesPersons, todayReportId] = await Promise.all([
    user.isManager ? fetchSalesPersons() : undefined,
    findReportIdByDate(user.id, today),
  ])

  const href = buildReportListHref({
    ...params,
    page: parsed.success ? parsed.data.page : undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">日報一覧</h1>
        {/* 本日分が作成済みなら、重複エラーにならないよう既存の日報へ誘導する */}
        <Button asChild>
          <Link href={todayReportId ? `/reports/${todayReportId}` : '/reports/new'}>
            {todayReportId ? '本日の日報を開く' : '新規日報作成'}
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">検索条件</h2>
        {/* 検索条件が変わったらフォームの入力状態も URL に合わせ直す */}
        <ReportSearchForm
          key={href}
          initial={{
            start_date: params.start_date,
            end_date: params.end_date,
            sales_person_id: params.sales_person_id,
          }}
          salesPersons={salesPersons?.map(({ id, name }) => ({ id, name }))}
        />
      </section>

      {parsed.success ? (
        // 検索条件ごとに fallback（スケルトン）を出し直す
        <Suspense key={href} fallback={<ReportListSkeleton />}>
          <ReportResults query={parsed.data} isManager={user.isManager} today={today} href={href} />
        </Suspense>
      ) : (
        <FormError message={parsed.error.issues[0]?.message ?? '検索条件が不正です'} />
      )}
    </div>
  )
}

async function ReportResults({
  query,
  isManager,
  today,
  href,
}: {
  query: Parameters<typeof listReports>[0]
  isManager: boolean
  today: string
  href: string
}) {
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
      <ReportTable reports={data} today={today} />
      <ReportPagination pagination={pagination} params={conditions} />
    </div>
  )
}
