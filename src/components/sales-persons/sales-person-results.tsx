import Link from 'next/link'
import { ErrorView } from '@/components/common/error-view'
import { SalesPersonTable } from '@/components/sales-persons/sales-person-table'
import { Button } from '@/components/ui/button'
import type { SalesPersonListQuery } from '@/schemas/sales-person'
import { listSalesPersons } from '@/server/services/sales-person'

type SalesPersonResultsProps = {
  query: SalesPersonListQuery
  currentUserId: number
  /** 再読み込み用の、現在の一覧 URL */
  href: string
}

/** 一覧の取得と表示（Server Component）。Suspense の中で使う */
export async function SalesPersonResults({ query, currentUserId, href }: SalesPersonResultsProps) {
  let people: Awaited<ReturnType<typeof listSalesPersons>>['data']
  try {
    people = (await listSalesPersons(query)).data
  } catch (error) {
    console.error('営業担当者一覧の取得に失敗しました', error)
    return (
      <ErrorView
        title="営業担当者一覧を取得できませんでした"
        message="時間をおいてもう一度お試しください。"
        action={
          <Button asChild>
            <Link href={href}>再読み込み</Link>
          </Button>
        }
      />
    )
  }

  if (people.length === 0) {
    const filtered = query.department !== undefined || query.is_manager !== undefined
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        {filtered ? '条件に一致する営業担当者はいません。' : '営業担当者が登録されていません。'}
      </p>
    )
  }

  return <SalesPersonTable people={people} currentUserId={currentUserId} />
}
