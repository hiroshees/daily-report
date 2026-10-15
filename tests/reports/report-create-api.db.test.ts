// @vitest-environment node
import { POST } from '@/app/api/v1/reports/route'
import { prisma } from '@/lib/prisma'
import { signSessionToken } from '@/server/jwt'
import { createCustomer, createReport, createSalesPerson, resetDatabase } from '../db/helpers'

async function post(body: unknown, as?: { id: number }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (as) headers.Authorization = `Bearer ${(await signSessionToken(as.id)).token}`
  const response = await POST(
    new Request('http://localhost/api/v1/reports', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  )
  return { status: response.status, body: await response.json() }
}

let user: { id: number }
let customer: { id: number }

const visit = (overrides: Record<string, unknown> = {}) => ({
  customer_id: customer.id,
  visit_time: '10:00',
  visit_content: '新商品の提案',
  ...overrides,
})
const payload = (overrides: Record<string, unknown> = {}) => ({
  report_date: '2025-07-27',
  problem: '課題',
  plan: '計画',
  visits: [visit()],
  ...overrides,
})

beforeEach(async () => {
  await resetDatabase()
  user = await createSalesPerson({ email: 'user@example.com' })
  customer = await createCustomer()
})
afterAll(() => prisma.$disconnect())

describe('POST /reports', () => {
  it('TC-REPORT-001: 日報と訪問記録を作成できる（sales_person_id はログインユーザー）', async () => {
    const other = await createSalesPerson({ email: 'other@example.com' })
    const { status, body } = await post(payload({ sales_person_id: other.id }), user)

    expect(status).toBe(201)
    expect(body).toMatchObject({
      report_date: '2025-07-27',
      sales_person_id: user.id,
      problem: '課題',
      plan: '計画',
    })
    expect(body.created_at).toMatch(/Z$/)

    const visits = await prisma.visitRecord.findMany({ where: { reportId: body.id } })
    expect(visits).toHaveLength(1)
    expect(visits[0]?.visitTime?.toISOString().slice(11, 16)).toBe('10:00')
  })

  it('管理者も自分の日報を作成できる', async () => {
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })
    expect((await post(payload(), manager)).status).toBe(201)
  })

  it('TC-REPORT-003: 訪問記録5件を登録できる（visit_time は任意）', async () => {
    const visits = Array.from({ length: 5 }, (_, i) =>
      visit(i === 0 ? { visit_time: undefined } : {}),
    )
    const { status, body } = await post(payload({ visits }), user)

    expect(status).toBe(201)
    expect(await prisma.visitRecord.count({ where: { reportId: body.id } })).toBe(5)
    expect(await prisma.visitRecord.count({ where: { visitTime: null } })).toBe(1)
  })

  it('訪問記録 0 件でも作成できる（件数は #27 で確定）', async () => {
    expect((await post(payload({ visits: [] }), user)).status).toBe(201)
  })

  it('TC-REPORT-002: 同一日付は 409 DUPLICATE_REPORT（別日・他人は可）', async () => {
    const other = await createSalesPerson({ email: 'other@example.com' })
    await createReport(user.id, '2025-07-27')

    const dup = await post(payload(), user)
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('DUPLICATE_REPORT')
    expect(dup.body.error.message).toBe('同じ日付の日報が既に存在します')

    expect((await post(payload({ report_date: '2025-07-28' }), user)).status).toBe(201)
    expect((await post(payload(), other)).status).toBe(201)
  })

  it('同時リクエスト2本は片方のみ成功し、もう片方は 409（日報は1件）', async () => {
    const results = await Promise.all([post(payload(), user), post(payload(), user)])

    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
    expect(await prisma.dailyReport.count()).toBe(1)
    expect(await prisma.visitRecord.count()).toBe(1)
  })

  it('TC-REPORT-004: 文字数の境界（上限は成功、超過は 400）', async () => {
    const ok = await post(
      payload({
        problem: 'あ'.repeat(1000),
        plan: 'い'.repeat(1000),
        visits: [visit({ visit_content: 'う'.repeat(500) })],
      }),
      user,
    )
    expect(ok.status).toBe(201)

    const ng = await post(
      payload({
        report_date: '2025-07-28',
        problem: 'あ'.repeat(1001),
        plan: 'い'.repeat(1001),
        visits: [visit({ visit_content: 'う'.repeat(501) })],
      }),
      user,
    )
    expect(ng.status).toBe(400)
    expect(ng.body.error.code).toBe('VALIDATION_ERROR')
    expect(ng.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'plan',
      'problem',
      'visits.0.visit_content',
    ])
  })

  it.each([
    ['problem 空', { problem: '' }],
    ['plan 空白のみ', { plan: '   ' }],
    ['日付形式', { report_date: '2025/07/27' }],
    ['存在しない日付', { report_date: '2025-02-30' }],
    ['visit_time 形式', { visits: [{ customer_id: 1, visit_time: '25:00', visit_content: 'x' }] }],
    ['visit_content 空', { visits: [{ customer_id: 1, visit_content: '' }] }],
    ['visits 欠落', { visits: undefined }],
  ])('入力不正（%s）は 400 で何も作成されない', async (_name, overrides) => {
    const { status, body } = await post(payload(overrides), user)

    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(await prisma.dailyReport.count()).toBe(0)
  })

  it('存在しない customer_id は 400 で、日報もロールバックされる', async () => {
    const { status, body } = await post(
      payload({ visits: [visit(), visit({ customer_id: 99999 })] }),
      user,
    )

    expect(status).toBe(400)
    expect(body.error.details).toEqual([
      { field: 'visits.1.customer_id', message: '指定された顧客が存在しません' },
    ])
    expect(await prisma.dailyReport.count()).toBe(0)
    expect(await prisma.visitRecord.count()).toBe(0)
  })

  it('未認証は 401', async () => {
    expect((await post(payload())).status).toBe(401)
  })
})
