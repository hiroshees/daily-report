import { generateSeedData, todayInJst } from '../../prisma/seed/data'

const BASE_DATE = '2025-07-28'
const data = generateSeedData({ baseDate: BASE_DATE, passwordHash: 'hash' })

describe('generateSeedData', () => {
  it('営業担当者は10名（管理者2名・一般8名）で、メールアドレスは一意', () => {
    expect(data.salesPersons).toHaveLength(10)
    expect(data.salesPersons.filter((p) => p.isManager)).toHaveLength(2)
    expect(new Set(data.salesPersons.map((p) => p.email)).size).toBe(10)
  })

  it('仕様書のアカウント（yamada=一般, tanaka=管理者）を含む', () => {
    const byEmail = new Map(data.salesPersons.map((p) => [p.email, p]))
    expect(byEmail.get('yamada@example.com')?.isManager).toBe(false)
    expect(byEmail.get('tanaka@example.com')).toMatchObject({ isManager: true, name: '田中 部長' })
  })

  it('顧客は100社で、画面例の顧客（ABC商事・XYZ工業）を含む', () => {
    expect(data.customers).toHaveLength(100)
    const names = data.customers.map((c) => c.companyName)
    expect(names).toContain('ABC商事')
    expect(names).toContain('XYZ工業')
  })

  it('日報は約600件（過去3ヶ月分）で、基準日（当日）の日報は含まない', () => {
    expect(data.reports.length).toBeGreaterThanOrEqual(550)
    expect(data.reports.length).toBeLessThanOrEqual(650)

    const dates = data.reports.map((r) => r.reportDate.toISOString().slice(0, 10)).sort()
    expect(dates[0]! >= '2025-04-28').toBe(true)
    expect(dates.at(-1)! < BASE_DATE).toBe(true)
  })

  it('日報は営業日（月〜金）のみで、1人1日1件（ユニーク制約に違反しない）', () => {
    for (const r of data.reports) {
      const weekday = r.reportDate.getUTCDay()
      expect(weekday).toBeGreaterThanOrEqual(1)
      expect(weekday).toBeLessThanOrEqual(5)
    }
    const keys = data.reports.map((r) => `${r.salesPersonId}:${r.reportDate.toISOString()}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('各日報に訪問記録が1〜5件あり、同じ日報で顧客は重複しない', () => {
    const byReport = Map.groupBy(data.visits, (v) => v.reportId)
    expect(byReport.size).toBe(data.reports.length)
    for (const visits of byReport.values()) {
      expect(visits.length).toBeGreaterThanOrEqual(1)
      expect(visits.length).toBeLessThanOrEqual(5)
      expect(new Set(visits.map((v) => v.customerId)).size).toBe(visits.length)
    }
  })

  it('訪問時刻は任意（未入力あり）で、入力されている場合は日報内で昇順', () => {
    expect(data.visits.some((v) => v.visitTime === null)).toBe(true)
    expect(data.visits.some((v) => v.visitTime !== null)).toBe(true)

    for (const visits of Map.groupBy(data.visits, (v) => v.reportId).values()) {
      const times = visits.flatMap((v) => (v.visitTime ? [v.visitTime.getTime()] : []))
      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
  })

  it('一部の日報にだけ、本人以外の管理者がコメントしている', () => {
    expect(data.comments.length).toBeGreaterThan(0)
    const commented = new Set(data.comments.map((c) => c.reportId))
    expect(commented.size).toBeLessThan(data.reports.length)

    const managers = new Set(data.salesPersons.filter((p) => p.isManager).map((p) => p.id))
    const reports = new Map(data.reports.map((r) => [r.id, r]))
    for (const c of data.comments) {
      expect(managers.has(c.managerId)).toBe(true)
      expect(c.managerId).not.toBe(reports.get(c.reportId)?.salesPersonId)
    }
  })

  it('全ての参照先（外部キー）が存在する', () => {
    const personIds = new Set(data.salesPersons.map((p) => p.id))
    const customerIds = new Set(data.customers.map((c) => c.id))
    const reportIds = new Set(data.reports.map((r) => r.id))

    expect(data.reports.every((r) => personIds.has(r.salesPersonId))).toBe(true)
    expect(
      data.visits.every((v) => reportIds.has(v.reportId) && customerIds.has(v.customerId)),
    ).toBe(true)
    expect(
      data.comments.every((c) => reportIds.has(c.reportId) && personIds.has(c.managerId)),
    ).toBe(true)
  })

  it('文字数が画面の上限（訪問内容500・課題/計画1000・コメント500）に収まる', () => {
    expect(data.visits.every((v) => v.visitContent.length <= 500)).toBe(true)
    expect(data.reports.every((r) => r.problem.length <= 1000 && r.plan.length <= 1000)).toBe(true)
    expect(data.comments.every((c) => c.comment.length <= 500)).toBe(true)
  })

  it('同じ seed・基準日なら同じデータになる（再現性）', () => {
    const again = generateSeedData({ baseDate: BASE_DATE, passwordHash: 'hash' })
    expect(again).toEqual(data)
  })
})

describe('todayInJst', () => {
  it('UTC の日付が変わる前でも JST の日付を返す', () => {
    expect(todayInJst(new Date('2025-07-27T16:00:00Z'))).toBe('2025-07-28')
    expect(todayInJst(new Date('2025-07-27T14:59:00Z'))).toBe('2025-07-27')
  })
})
