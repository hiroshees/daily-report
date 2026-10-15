import { buildReportListHref } from '@/lib/report-list-params'

describe('buildReportListHref', () => {
  it('条件がなければ /reports', () => {
    expect(buildReportListHref({})).toBe('/reports')
    expect(buildReportListHref({ page: 1 })).toBe('/reports')
  })

  it('指定した条件とページを載せる', () => {
    expect(
      buildReportListHref({
        start_date: '2025-07-01',
        end_date: '2025-07-31',
        sales_person_id: '2',
        page: 3,
      }),
    ).toBe('/reports?start_date=2025-07-01&end_date=2025-07-31&sales_person_id=2&page=3')
  })
})
