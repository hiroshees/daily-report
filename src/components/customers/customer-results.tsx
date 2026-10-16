import Link from 'next/link'
import { CustomerPagination } from '@/components/customers/customer-pagination'
import { CustomerTable } from '@/components/customers/customer-table'
import { ErrorView } from '@/components/common/error-view'
import { Button } from '@/components/ui/button'
import { buildCustomerListHref } from '@/lib/customer-list-params'
import type { CustomerListQuery } from '@/schemas/customer'
import { listCustomers } from '@/server/services/customer'

type CustomerResultsProps = {
  query: CustomerListQuery
  /** 再読み込み用の、現在の一覧 URL */
  href: string
}

/** 一覧の取得と表示（Server Component）。Suspense の中で使う */
export async function CustomerResults({ query, href }: CustomerResultsProps) {
  let result: Awaited<ReturnType<typeof listCustomers>>
  try {
    result = await listCustomers(query)
  } catch (error) {
    console.error('顧客一覧の取得に失敗しました', error)
    return (
      <ErrorView
        title="顧客一覧を取得できませんでした"
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

  // 範囲外のページ（URL の手入力・最後の 1 件の削除直後など）。0 件ではないので、1 ページ目へ戻る導線を出す
  if (data.length === 0 && pagination.total > 0) {
    return (
      <div className="text-muted-foreground space-y-3 py-10 text-center text-sm">
        <p>このページには顧客がありません。</p>
        <Button asChild variant="outline" size="sm">
          <Link href={buildCustomerListHref({ search: query.search })}>1ページ目へ戻る</Link>
        </Button>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        {query.search?.trim() ? '条件に一致する顧客はありません。' : '顧客が登録されていません。'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <CustomerTable customers={data} />
      <CustomerPagination pagination={pagination} search={query.search} />
    </div>
  )
}
