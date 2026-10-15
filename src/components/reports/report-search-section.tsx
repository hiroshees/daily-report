import { ReportSearchForm } from '@/components/reports/report-search-form'
import { listSalesPersons } from '@/server/services/sales-person'

type ReportSearchSectionProps = {
  initial: { start_date?: string; end_date?: string; sales_person_id?: string }
  isManager: boolean
}

/** 検索フォーム。管理者のみ、営業担当の選択肢を取得して渡す（Server Component） */
export async function ReportSearchSection({ initial, isManager }: ReportSearchSectionProps) {
  let salesPersons: { id: number; name: string }[] | undefined
  if (isManager) {
    try {
      const { data } = await listSalesPersons({})
      salesPersons = data.map(({ id, name }) => ({ id, name }))
    } catch (error) {
      // 担当者での絞り込みだけ諦め、期間での検索は使えるようにする
      console.error('営業担当の一覧の取得に失敗しました', error)
    }
  }

  return <ReportSearchForm initial={initial} salesPersons={salesPersons} />
}
