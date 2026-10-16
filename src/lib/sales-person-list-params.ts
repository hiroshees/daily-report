export type SalesPersonListParams = {
  department?: string
  is_manager?: 'true' | 'false'
}

/** 営業担当者一覧の URL（`/sales-persons?...`）。空の条件は載せない */
export function buildSalesPersonListHref(params: SalesPersonListParams): string {
  const search = new URLSearchParams()
  if (params.department) search.set('department', params.department)
  if (params.is_manager) search.set('is_manager', params.is_manager)
  const query = search.toString()
  return query ? `/sales-persons?${query}` : '/sales-persons'
}
