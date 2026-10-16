import Link from 'next/link'
import { Suspense } from 'react'
import { ForbiddenView } from '@/components/common/error-view'
import { FormError } from '@/components/common/form-error'
import { ReportListSkeleton } from '@/components/reports/report-list-skeleton'
import { SalesPersonFilterSection } from '@/components/sales-persons/sales-person-filter-section'
import { SalesPersonFormDialog } from '@/components/sales-persons/sales-person-form-dialog'
import { SalesPersonResults } from '@/components/sales-persons/sales-person-results'
import { Button } from '@/components/ui/button'
import { buildSalesPersonListHref } from '@/lib/sales-person-list-params'
import { SalesPersonListQuerySchema } from '@/schemas/sales-person'
import { requireManagerPage } from '@/server/page-auth'

type SearchParams = Record<string, string | string[] | undefined>

/** 同じキーが複数あっても先頭だけを使う */
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 管理者専用。ナビのリンクを隠すだけでは URL 直打ちを防げないため、ページでも確認する
  const { allowed, user } = await requireManagerPage()
  if (!allowed) return <ForbiddenView />

  const raw = await searchParams
  // 空文字（未選択の絞り込み）は未指定として扱う
  const params = {
    department: first(raw.department) || undefined,
    is_manager: first(raw.is_manager) || undefined,
  }
  const parsed = SalesPersonListQuerySchema.safeParse(params)
  const href = buildSalesPersonListHref(parsed.success ? parsed.data : {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">営業担当者管理</h1>
        <SalesPersonFormDialog trigger={<Button>新規登録</Button>} />
      </div>

      {parsed.success ? (
        <>
          {/* 部署の選択肢の取得を待たずに、先に絞り込み（選択肢なし）と一覧のスケルトンを表示する */}
          <Suspense fallback={<SalesPersonFilterSection current={parsed.data} departments={[]} />}>
            <SalesPersonFilterSection current={parsed.data} />
          </Suspense>
          {/* 絞り込み条件ごとに fallback（スケルトン）を出し直す */}
          <Suspense key={href} fallback={<ReportListSkeleton />}>
            <SalesPersonResults query={parsed.data} currentUserId={user.id} href={href} />
          </Suspense>
        </>
      ) : (
        <div className="space-y-3">
          <FormError message={parsed.error.issues[0]?.message ?? '絞り込み条件が不正です'} />
          <Button asChild variant="outline" size="sm">
            <Link href="/sales-persons">条件をクリアして一覧に戻る</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
