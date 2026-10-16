export type CustomerListParams = {
  search?: string
  page?: number
}

/** 顧客一覧の URL（`/customers?...`）。空の条件は載せず、1 ページ目は page を省略する */
export function buildCustomerListHref(params: CustomerListParams): string {
  const search = new URLSearchParams()
  const keyword = params.search?.trim()
  if (keyword) search.set('search', keyword)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/customers?${query}` : '/customers'
}
