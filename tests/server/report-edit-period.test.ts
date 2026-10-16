import { isReportEditExpired } from '@/server/report-edit-period'

const DAY_MS = 24 * 60 * 60 * 1000
const createdAt = new Date('2025-07-01T00:00:00Z')

afterEach(() => vi.unstubAllEnvs())

describe('isReportEditExpired', () => {
  it('既定は作成から 7 日。ちょうど 7 日までは編集できる', () => {
    expect(isReportEditExpired(createdAt, createdAt.getTime() + 7 * DAY_MS)).toBe(false)
    expect(isReportEditExpired(createdAt, createdAt.getTime() + 7 * DAY_MS + 1)).toBe(true)
  })

  it('REPORT_EDIT_LIMIT_DAYS で期間を変更できる', () => {
    vi.stubEnv('REPORT_EDIT_LIMIT_DAYS', '30')

    expect(isReportEditExpired(createdAt, createdAt.getTime() + 30 * DAY_MS)).toBe(false)
    expect(isReportEditExpired(createdAt, createdAt.getTime() + 30 * DAY_MS + 1)).toBe(true)
  })
})
