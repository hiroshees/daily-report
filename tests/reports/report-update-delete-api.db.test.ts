// @vitest-environment node
import { DELETE, PUT } from '@/app/api/v1/reports/[id]/route'
import { prisma } from '@/lib/prisma'
import { signSessionToken } from '@/server/jwt'
import { createCustomer, createReport, createSalesPerson, resetDatabase } from '../db/helpers'

async function call(
  method: 'PUT' | 'DELETE',
  id: number | string,
  body?: unknown,
  as?: { id: number },
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (as) headers.Authorization = `Bearer ${(await signSessionToken(as.id)).token}`
  const handler = method === 'PUT' ? PUT : DELETE
  const response = await handler(
    new Request(`http://localhost/api/v1/reports/${id}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: String(id) }) },
  )
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

let user: { id: number }
let customer: { id: number }
let report: { id: number }
let visitIds: number[]

const visit = (overrides: Record<string, unknown> = {}) => ({
  customer_id: customer.id,
  visit_time: '10:00',
  visit_content: '更新後の訪問内容',
  ...overrides,
})
const payload = (overrides: Record<string, unknown> = {}) => ({
  problem: '更新後の課題',
  plan: '更新後の計画',
  visits: [],
  ...overrides,
})

beforeEach(async () => {
  await resetDatabase()
  user = await createSalesPerson({ email: 'user@example.com' })
  customer = await createCustomer()
  report = await createReport(user.id)
  const created = await Promise.all(
    ['A', 'B'].map((content) =>
      prisma.visitRecord.create({
        data: { reportId: report.id, customerId: customer.id, visitContent: content },
      }),
    ),
  )
  visitIds = created.map((v) => v.id)
})
afterAll(() => prisma.$disconnect())
afterEach(() => vi.useRealTimers())

describe('PUT /reports/{id}', () => {
  it('本人は更新できる（日付・作成者は変更されず、updated_at が更新される）', async () => {
    const before = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    const other = await createSalesPerson({ email: 'other@example.com' })

    const { status, body } = await call(
      'PUT',
      report.id,
      payload({ report_date: '2030-01-01', sales_person_id: other.id }),
      user,
    )

    expect(status).toBe(200)
    expect(body).toMatchObject({
      id: report.id,
      report_date: '2025-07-27',
      sales_person_id: user.id,
      problem: '更新後の課題',
      plan: '更新後の計画',
    })
    const after = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
  })

  it('管理者も自分の日報は更新できる', async () => {
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })
    const own = await createReport(manager.id, '2025-07-28')
    expect((await call('PUT', own.id, payload(), manager)).status).toBe(200)
  })

  it('visits の追加・更新・削除が 1 回の PUT で反映される', async () => {
    const [keep, drop] = visitIds as [number, number]
    const { status } = await call(
      'PUT',
      report.id,
      payload({
        visits: [
          visit({ id: keep, visit_time: undefined, visit_content: 'Aを更新' }),
          visit({ visit_content: '新規C' }),
        ],
      }),
      user,
    )

    expect(status).toBe(200)
    const visits = await prisma.visitRecord.findMany({
      where: { reportId: report.id },
      orderBy: { id: 'asc' },
    })
    expect(visits.map((v) => v.visitContent)).toEqual(['Aを更新', '新規C'])
    expect(visits[0]?.id).toBe(keep)
    expect(visits[0]?.visitTime).toBeNull()
    expect(visits.some((v) => v.id === drop)).toBe(false)
  })

  it('visits が空配列なら既存の訪問記録は全て削除される', async () => {
    expect((await call('PUT', report.id, payload({ visits: [] }), user)).status).toBe(200)
    expect(await prisma.visitRecord.count({ where: { reportId: report.id } })).toBe(0)
  })

  it('他人の日報は 403（一般ユーザー・管理者とも）で、何も変更されない', async () => {
    const other = await createSalesPerson({ email: 'other@example.com' })
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })

    for (const actor of [other, manager]) {
      const { status, body } = await call('PUT', report.id, payload(), actor)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
    const unchanged = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })
    expect(unchanged.problem).toBe('課題')
    expect(await prisma.visitRecord.count({ where: { reportId: report.id } })).toBe(2)
  })

  it('編集期限（既定 7 日）を過ぎると 403 EDIT_PERIOD_EXPIRED、期限内は可', async () => {
    const day = 24 * 60 * 60 * 1000
    const createdAt = (await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } }))
      .createdAt

    vi.useFakeTimers({ toFake: ['Date'], now: createdAt.getTime() + 7 * day })
    expect((await call('PUT', report.id, payload(), user)).status).toBe(200)

    vi.setSystemTime(createdAt.getTime() + 7 * day + 60_000)
    const { status, body } = await call('PUT', report.id, payload(), user)
    expect(status).toBe(403)
    expect(body.error.code).toBe('EDIT_PERIOD_EXPIRED')
    expect(body.error.message).toBe('編集可能な期間を過ぎています')
  })

  it('REPORT_EDIT_LIMIT_DAYS で期限を変更できる', async () => {
    vi.stubEnv('REPORT_EDIT_LIMIT_DAYS', '0')
    try {
      await new Promise((resolve) => setTimeout(resolve, 5))
      expect((await call('PUT', report.id, payload(), user)).body.error.code).toBe(
        'EDIT_PERIOD_EXPIRED',
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('他日報の visit_id が混入すると 400 で、何も変更されない', async () => {
    const otherReport = await createReport(user.id, '2025-07-28')
    const foreign = await prisma.visitRecord.create({
      data: { reportId: otherReport.id, customerId: customer.id, visitContent: '他日報' },
    })

    const { status, body } = await call(
      'PUT',
      report.id,
      payload({ visits: [visit(), visit({ id: foreign.id })] }),
      user,
    )

    expect(status).toBe(400)
    expect(body.error.details).toEqual([
      { field: 'visits.1.id', message: 'この日報の訪問記録ではありません' },
    ])
    expect(
      (await prisma.visitRecord.findUniqueOrThrow({ where: { id: foreign.id } })).visitContent,
    ).toBe('他日報')
    expect(await prisma.visitRecord.count({ where: { reportId: report.id } })).toBe(2)
    expect((await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })).problem).toBe(
      '課題',
    )
  })

  it('同じ visit_id の重複指定は 400', async () => {
    const [first] = visitIds as [number]
    const { status, body } = await call(
      'PUT',
      report.id,
      payload({ visits: [visit({ id: first }), visit({ id: first })] }),
      user,
    )
    expect(status).toBe(400)
    expect(body.error.details[0].field).toBe('visits.1.id')
  })

  it('存在しない customer_id は 400 で、日報も訪問記録もロールバックされる', async () => {
    const { status, body } = await call(
      'PUT',
      report.id,
      payload({ visits: [visit({ id: visitIds[0] }), visit({ customer_id: 99999 })] }),
      user,
    )

    expect(status).toBe(400)
    expect(body.error.details).toEqual([
      { field: 'visits.1.customer_id', message: '指定された顧客が存在しません' },
    ])
    expect((await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })).problem).toBe(
      '課題',
    )
    expect(await prisma.visitRecord.count({ where: { reportId: report.id } })).toBe(2)
  })

  it.each([
    ['problem 空', { problem: '' }],
    ['plan 超過', { plan: 'あ'.repeat(1001) }],
    ['visit_content 空', { visits: [{ customer_id: 1, visit_content: '' }] }],
    ['visits 欠落', { visits: undefined }],
  ])('入力不正（%s）は 400', async (_name, overrides) => {
    const { status, body } = await call('PUT', report.id, payload(overrides), user)
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('存在しない日報は 404、ID 形式不正は 400、未認証は 401', async () => {
    expect((await call('PUT', 99999, payload(), user)).status).toBe(404)
    expect((await call('PUT', 'abc', payload(), user)).status).toBe(400)
    expect((await call('PUT', report.id, payload())).status).toBe(401)
  })
})

describe('DELETE /reports/{id}', () => {
  it('本人は削除でき、訪問記録・コメントも Cascade で削除される', async () => {
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })
    await prisma.managerComment.create({
      data: { reportId: report.id, managerId: manager.id, comment: 'コメント' },
    })

    const { status, body } = await call('DELETE', report.id, undefined, user)

    expect(status).toBe(204)
    expect(body).toBeNull()
    expect(await prisma.dailyReport.count()).toBe(0)
    expect(await prisma.visitRecord.count()).toBe(0)
    expect(await prisma.managerComment.count()).toBe(0)
  })

  it('他人の日報は管理者でも 403 で、削除されない', async () => {
    const other = await createSalesPerson({ email: 'other@example.com' })
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })

    for (const actor of [other, manager]) {
      const { status, body } = await call('DELETE', report.id, undefined, actor)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
    expect(await prisma.dailyReport.count()).toBe(1)
  })

  it('存在しない日報は 404、未認証は 401', async () => {
    expect((await call('DELETE', 99999, undefined, user)).status).toBe(404)
    expect((await call('DELETE', report.id)).status).toBe(401)
  })
})
