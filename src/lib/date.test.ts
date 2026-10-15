import { formatReportDate, todayInJst } from '@/lib/date'

describe('formatReportDate', () => {
  it('同じ年は M/d 形式', () => {
    expect(formatReportDate('2025-07-27', '2025-08-01')).toBe('7/27')
    expect(formatReportDate('2025-01-05', '2025-08-01')).toBe('1/5')
  })

  it('年をまたぐ場合は年も表示する', () => {
    expect(formatReportDate('2024-12-31', '2025-01-01')).toBe('2024/12/31')
  })
})

describe('todayInJst', () => {
  it('UTC の日付が変わる前でも日本時間の日付を返す', () => {
    expect(todayInJst(new Date('2025-07-26T15:30:00Z'))).toBe('2025-07-27')
    expect(todayInJst(new Date('2025-07-26T14:59:00Z'))).toBe('2025-07-26')
  })
})
