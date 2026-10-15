export type ReportListParams = {
  start_date?: string
  end_date?: string
  sales_person_id?: string
  page?: number
}

/** 一覧画面の URL（`/reports?...`）。空の条件は載せず、1 ページ目は page を省略する */
export function buildReportListHref(params: ReportListParams): string {
  const search = new URLSearchParams()
  if (params.start_date) search.set('start_date', params.start_date)
  if (params.end_date) search.set('end_date', params.end_date)
  if (params.sales_person_id) search.set('sales_person_id', params.sales_person_id)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/reports?${query}` : '/reports'
}
