import { SalesPersonFilter } from '@/components/sales-persons/sales-person-filter'
import type { SalesPersonListParams } from '@/lib/sales-person-list-params'
import { listSalesPersons } from '@/server/services/sales-person'

type SalesPersonFilterSectionProps = {
  current: SalesPersonListParams
  /** 部署の選択肢。未指定なら全担当者から取得する */
  departments?: string[]
}

/** 絞り込みの表示。部署の選択肢は、絞り込み前の全担当者から作る（Server Component） */
export async function SalesPersonFilterSection({
  current,
  departments,
}: SalesPersonFilterSectionProps) {
  if (departments) return <SalesPersonFilter current={current} departments={departments} />

  let options: string[] = []
  try {
    const { data } = await listSalesPersons({})
    options = [...new Set(data.map((person) => person.department))].sort((a, b) =>
      a.localeCompare(b, 'ja'),
    )
  } catch (error) {
    // 部署での絞り込みだけ諦め、一覧は使えるようにする
    console.error('部署の一覧の取得に失敗しました', error)
  }

  return <SalesPersonFilter current={current} departments={options} />
}
