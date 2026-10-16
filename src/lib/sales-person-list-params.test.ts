import { buildSalesPersonListHref } from '@/lib/sales-person-list-params'

describe('buildSalesPersonListHref', () => {
  it('条件なしは /sales-persons', () => {
    expect(buildSalesPersonListHref({})).toBe('/sales-persons')
  })

  it('部署は URL エンコードし、権限と組み合わせられる', () => {
    expect(buildSalesPersonListHref({ department: '営業1課', is_manager: 'true' })).toBe(
      `/sales-persons?department=${encodeURIComponent('営業1課')}&is_manager=true`,
    )
  })

  it('空の部署は載せない', () => {
    expect(buildSalesPersonListHref({ department: '', is_manager: 'false' })).toBe(
      '/sales-persons?is_manager=false',
    )
  })
})
