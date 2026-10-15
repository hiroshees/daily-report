import { Suspense } from 'react'
import { FormError } from '@/components/common/form-error'
import { NewReportButton } from '@/components/reports/new-report-button'
import { ReportListSkeleton } from '@/components/reports/report-list-skeleton'
import { ReportResults } from '@/components/reports/report-results'
import { ReportSearchSection } from '@/components/reports/report-search-section'
import { Button } from '@/components/ui/button'
import { todayInJst } from '@/lib/date'
import { buildReportListHref } from '@/lib/report-list-params'
import { ReportListQuerySchema } from '@/schemas/report'
import { requirePageUser } from '@/server/page-auth'

type SearchParams = Record<string, string | string[] | undefined>

/** 同じキーが複数あっても先頭だけを使う */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // レイアウトの確認に頼らず、ページでも確認する
  const user = await requirePageUser()
  const raw = await searchParams

  // 空文字（未入力の検索条件）は未指定として扱う。
  // 営業担当の絞り込みは管理者のみ。一般ユーザーの指定は（不正値でも）無視する
  const params = {
    start_date: first(raw.start_date) || undefined,
    end_date: first(raw.end_date) || undefined,
    sales_person_id: user.isManager ? first(raw.sales_person_id) || undefined : undefined,
    page: first(raw.page) || undefined,
  }
  const parsed = ReportListQuerySchema.safeParse(params)
  const today = todayInJst()

  const href = buildReportListHref({
    ...params,
    page: parsed.success ? parsed.data.page : undefined,
  })

  // 開始日 > 終了日は、検索フォーム側がエラーを表示する（二重表示を避ける）
  const dateOrderInvalid = Boolean(
    params.start_date && params.end_date && params.start_date > params.end_date,
  )

  // 担当者一覧・本日分の確認は、失敗や遅延でページ全体を止めないよう Suspense の中で取得する
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">日報一覧</h1>
        <Suspense
          fallback={
            <Button disabled aria-busy>
              新規日報作成
            </Button>
          }
        >
          <NewReportButton userId={user.id} today={today} />
        </Suspense>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">検索条件</h2>
        {/* 検索条件が変わったらフォームの入力状態も URL に合わせ直す */}
        <Suspense key={href} fallback={<div className="bg-muted h-16 animate-pulse rounded-md" />}>
          <ReportSearchSection
            initial={{
              start_date: params.start_date,
              end_date: params.end_date,
              sales_person_id: params.sales_person_id,
            }}
            isManager={user.isManager}
          />
        </Suspense>
      </section>

      {parsed.success ? (
        // 検索条件ごとに fallback（スケルトン）を出し直す
        <Suspense key={href} fallback={<ReportListSkeleton />}>
          <ReportResults query={parsed.data} isManager={user.isManager} today={today} href={href} />
        </Suspense>
      ) : (
        !dateOrderInvalid && (
          <FormError message={parsed.error.issues[0]?.message ?? '検索条件が不正です'} />
        )
      )}
    </div>
  )
}
