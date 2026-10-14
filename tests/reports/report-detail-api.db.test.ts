// @vitest-environment node
import { GET } from '@/app/api/v1/reports/[id]/route'
import { prisma } from '@/lib/prisma'
import { signSessionToken } from '@/server/jwt'
import { createCustomer, createReport, createSalesPerson, resetDatabase } from '../db/helpers'

async function get(id: string | number, as?: { id: number }) {
  const headers: Record<string, string> = {}
  if (as) headers.Authorization = `Bearer ${(await signSessionToken(as.id)).token}`
  const response = await GET(new Request(`http://localhost/api/v1/reports/${id}`, { headers }), {
    params: Promise.resolve({ id: String(id) }),
  })
  return { status: response.status, body: await response.json() }
}

const time = (hour: number, minute: number) => new Date(Date.UTC(1970, 0, 1, hour, minute))

let author: { id: number }
let other: { id: number }
let manager: { id: number }

beforeEach(async () => {
  await resetDatabase()
  author = await createSalesPerson({ email: 'author@example.com' })
  other = await createSalesPerson({ email: 'other@example.com' })
  manager = await createSalesPerson({ email: 'manager@example.com', isManager: true })
})
afterAll(() => prisma.$disconnect())

describe('GET /reports/{id}', () => {
  it('訪問記録・コメント込みで取得できる（他人の日報も閲覧可）', async () => {
    const report = await createReport(author.id)
    const customer = await createCustomer('ABC商事')
    await prisma.visitRecord.create({
      data: {
        reportId: report.id,
        customerId: customer.id,
        visitContent: '提案',
        visitTime: time(9, 5),
      },
    })
    await prisma.managerComment.create({
      data: { reportId: report.id, managerId: manager.id, comment: '了解' },
    })

    const { status, body } = await get(report.id, other)

    expect(status).toBe(200)
    expect(body).toMatchObject({
      id: report.id,
      report_date: '2025-07-27',
      sales_person: { id: author.id, name: '山田太郎', email: 'author@example.com' },
      problem: '課題',
      plan: '計画',
      visits: [
        {
          customer: { id: customer.id, company_name: 'ABC商事' },
          visit_time: '09:05',
          visit_content: '提案',
        },
      ],
      comments: [{ manager: { id: manager.id, name: '山田太郎' }, comment: '了解' }],
    })
    expect(body.created_at).toMatch(/Z$/)
    expect(body.updated_at).toMatch(/Z$/)
  })

  it('visits は時刻の昇順（null は末尾）、comments は作成日時の昇順', async () => {
    const report = await createReport(author.id)
    const customer = await createCustomer()
    const visit = (visitContent: string, visitTime: Date | null) =>
      prisma.visitRecord.create({
        data: { reportId: report.id, customerId: customer.id, visitContent, visitTime },
      })
    await visit('なし', null)
    await visit('午後', time(14, 0))
    await visit('午前', time(10, 0))
    const comment = (text: string, createdAt: string) =>
      prisma.managerComment.create({
        data: {
          reportId: report.id,
          managerId: manager.id,
          comment: text,
          createdAt: new Date(createdAt),
        },
      })
    await comment('2番目', '2025-07-27T18:00:00Z')
    await comment('1番目', '2025-07-27T17:00:00Z')

    const { body } = await get(report.id, author)

    expect(body.visits.map((v: { visit_content: string }) => v.visit_content)).toEqual([
      '午前',
      '午後',
      'なし',
    ])
    expect(body.visits[2].visit_time).toBeNull()
    expect(body.comments.map((c: { comment: string }) => c.comment)).toEqual(['1番目', '2番目'])
  })

  it('訪問記録・コメントが無い日報は空配列', async () => {
    const report = await createReport(author.id)
    const { body } = await get(report.id, author)
    expect(body.visits).toEqual([])
    expect(body.comments).toEqual([])
  })

  it('存在しない ID は 404 NOT_FOUND', async () => {
    const { status, body } = await get(9999, author)
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it.each(['abc', '0', '-1', '1.5'])('数値でない・不正な ID（%s）は 400', async (id) => {
    const { status, body } = await get(id, author)
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('未認証は 401', async () => {
    const report = await createReport(author.id)
    const { status, body } = await get(report.id)
    expect(status).toBe(401)
    expect(body.error.code).toBe('AUTH_UNAUTHORIZED')
  })
})
