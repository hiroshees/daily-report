import { buildCustomerListHref } from '@/lib/customer-list-params'

describe('buildCustomerListHref', () => {
  it('条件なしは /customers', () => {
    expect(buildCustomerListHref({})).toBe('/customers')
  })

  it('空・空白のみの検索語と 1 ページ目は載せない', () => {
    expect(buildCustomerListHref({ search: '  ', page: 1 })).toBe('/customers')
  })

  it('検索語は前後の空白を除き、URL エンコードする', () => {
    expect(buildCustomerListHref({ search: ' ABC 商事 ' })).toBe(
      '/customers?search=ABC+%E5%95%86%E4%BA%8B',
    )
  })

  it('2 ページ目以降は page を載せる', () => {
    expect(buildCustomerListHref({ search: 'abc', page: 3 })).toBe('/customers?search=abc&page=3')
  })
})
