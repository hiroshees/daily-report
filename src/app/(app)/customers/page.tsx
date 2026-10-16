import Link from 'next/link'
import { Suspense } from 'react'
import { FormError } from '@/components/common/form-error'
import { ForbiddenView } from '@/components/common/error-view'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { CustomerResults } from '@/components/customers/customer-results'
import { CustomerSearchForm } from '@/components/customers/customer-search-form'
import { ReportListSkeleton } from '@/components/reports/report-list-skeleton'
import { Button } from '@/components/ui/button'
import { buildCustomerListHref } from '@/lib/customer-list-params'
import { CustomerListQuerySchema } from '@/schemas/customer'
import { requireManagerPage } from '@/server/page-auth'

type SearchParams = Record<string, string | string[] | undefined>

/** 同じキーが複数あっても先頭だけを使う */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 管理者専用。ナビのリンクを隠すだけでは URL 直打ちを防げないため、ページでも確認する
  const { allowed } = await requireManagerPage()
  if (!allowed) return <ForbiddenView />

  const raw = await searchParams
  // 空文字（未入力の検索条件）は未指定として扱う
  const params = {
    search: first(raw.search)?.trim() || undefined,
    page: first(raw.page) || undefined,
  }
  const parsed = CustomerListQuerySchema.safeParse(params)
  const href = buildCustomerListHref({
    search: params.search,
    page: parsed.success ? parsed.data.page : undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">顧客マスタ管理</h1>
        <CustomerFormDialog trigger={<Button>新規登録</Button>} />
      </div>

      {/* 検索条件が変わったらフォームの入力状態も URL に合わせ直す */}
      <CustomerSearchForm key={params.search ?? ''} initial={params.search} />

      {parsed.success ? (
        // 検索条件ごとに fallback（スケルトン）を出し直す
        <Suspense key={href} fallback={<ReportListSkeleton />}>
          <CustomerResults query={parsed.data} href={href} />
        </Suspense>
      ) : (
        <div className="space-y-3">
          <FormError message={parsed.error.issues[0]?.message ?? '検索条件が不正です'} />
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">条件をクリアして一覧に戻る</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
