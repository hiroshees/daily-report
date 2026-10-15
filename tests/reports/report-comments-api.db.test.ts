// @vitest-environment node
import { GET, POST } from '@/app/api/v1/reports/[id]/comments/route'
import { prisma } from '@/lib/prisma'
import { signSessionToken } from '@/server/jwt'
import { createReport, createSalesPerson, resetDatabase } from '../db/helpers'

async function call(
  method: 'GET' | 'POST',
  id: string | number,
  options: { as?: { id: number }; body?: unknown } = {},
) {
  const headers: Record<string, string> = {}
  if (options.as) headers.Authorization = `Bearer ${(await signSessionToken(options.as.id)).token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const request = new Request(`http://localhost/api/v1/reports/${id}/comments`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const handler = method === 'GET' ? GET : POST
  const response = await handler(request, { params: Promise.resolve({ id: String(id) }) })
  return { status: response.status, body: await response.json() }
}

let author: { id: number }
let manager: { id: number }
let reportId: number

beforeEach(async () => {
  await resetDatabase()
  author = await createSalesPerson({ email: 'author@example.com' })
  manager = await createSalesPerson({ email: 'manager@example.com', isManager: true })
  reportId = (await createReport(author.id)).id
})
afterAll(() => prisma.$disconnect())

describe('GET /reports/{id}/comments', () => {
  it('作成日時の昇順で取得できる（一般ユーザーも閲覧可）', async () => {
    const create = (comment: string, createdAt: string) =>
      prisma.managerComment.create({
        data: { reportId, managerId: manager.id, comment, createdAt: new Date(createdAt) },
      })
    await create('2件目', '2025-07-27T10:00:00Z')
    await create('1件目', '2025-07-27T09:00:00Z')

    const { status, body } = await call('GET', reportId, { as: author })

    expect(status).toBe(200)
    expect(body.data.map((c: { comment: string }) => c.comment)).toEqual(['1件目', '2件目'])
    expect(body.data[0]).toMatchObject({
      manager: { id: manager.id, name: '山田太郎' },
      created_at: '2025-07-27T09:00:00Z',
    })
  })

  it('コメントが無ければ空配列', async () => {
    const { status, body } = await call('GET', reportId, { as: author })
    expect(status).toBe(200)
    expect(body).toEqual({ data: [] })
  })

  it('存在しない日報は 404', async () => {
    expect((await call('GET', 99999, { as: author })).status).toBe(404)
  })

  it('未認証は 401', async () => {
    expect((await call('GET', reportId)).status).toBe(401)
  })
})

describe('POST /reports/{id}/comments', () => {
  it('管理者が追加できる（manager_id はログインユーザー）', async () => {
    const { status, body } = await call('POST', reportId, {
      as: manager,
      body: { comment: '明日相談しましょう', manager_id: author.id },
    })

    expect(status).toBe(201)
    expect(body).toMatchObject({
      report_id: reportId,
      manager_id: manager.id,
      comment: '明日相談しましょう',
    })
    expect(body.created_at).toMatch(/Z$/)
    expect(await prisma.managerComment.count({ where: { reportId } })).toBe(1)
  })

  it('同一日報に複数回追加できる', async () => {
    await call('POST', reportId, { as: manager, body: { comment: 'A' } })
    const { status } = await call('POST', reportId, { as: manager, body: { comment: 'B' } })

    expect(status).toBe(201)
    expect(await prisma.managerComment.count({ where: { reportId } })).toBe(2)
  })

  it('一般ユーザーは 403（追加されない）', async () => {
    const { status, body } = await call('POST', reportId, { as: author, body: { comment: 'x' } })

    expect(status).toBe(403)
    expect(body.error.code).toBe('FORBIDDEN')
    expect(await prisma.managerComment.count()).toBe(0)
  })

  it('500文字は成功、501文字は 400', async () => {
    const ok = await call('POST', reportId, { as: manager, body: { comment: 'あ'.repeat(500) } })
    const ng = await call('POST', reportId, { as: manager, body: { comment: 'あ'.repeat(501) } })

    expect(ok.status).toBe(201)
    expect(ng.status).toBe(400)
    expect(ng.body.error.code).toBe('VALIDATION_ERROR')
  })

  it.each(['', '   ', '\n\t'])('空・空白のみ（%j）は 400', async (comment) => {
    expect((await call('POST', reportId, { as: manager, body: { comment } })).status).toBe(400)
  })

  it('存在しない日報は 404', async () => {
    expect((await call('POST', 99999, { as: manager, body: { comment: 'x' } })).status).toBe(404)
  })

  it('未認証は 401', async () => {
    expect((await call('POST', reportId, { body: { comment: 'x' } })).status).toBe(401)
  })
})
