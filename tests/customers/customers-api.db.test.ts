// @vitest-environment node
import { DELETE, GET as getOne, PUT } from '@/app/api/v1/customers/[id]/route'
import { GET as list, POST } from '@/app/api/v1/customers/route'
import { prisma } from '@/lib/prisma'
import { signSessionToken } from '@/server/jwt'
import { createCustomer, createReport, createSalesPerson, resetDatabase } from '../db/helpers'

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string | undefined>> },
) => Promise<Response>

async function call(
  handler: unknown,
  init: {
    as?: { id: number }
    id?: string | number
    query?: string
    method?: string
    body?: unknown
  } = {},
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.as) headers.Authorization = `Bearer ${(await signSessionToken(init.as.id)).token}`
  const response = await (handler as Handler)(
    new Request(`http://localhost/api/v1/customers${init.query ?? ''}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
    { params: Promise.resolve(init.id === undefined ? {} : { id: String(init.id) }) },
  )
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

const newBody = {
  company_name: 'XYZ工業',
  contact_person: '鈴木二郎',
  phone: '06-1234-5678',
  email: 'suzuki@xyz.co.jp',
  address: '大阪府大阪市...',
}

let admin: { id: number }
let member: { id: number }

beforeEach(async () => {
  await resetDatabase()
  admin = await createSalesPerson({ email: 'admin@example.com', isManager: true })
  member = await createSalesPerson({ email: 'member@example.com' })
})
afterAll(() => prisma.$disconnect())

describe('認証・認可', () => {
  it('全エンドポイントで未認証は 401', async () => {
    const results = await Promise.all([
      call(list),
      call(getOne, { id: 1 }),
      call(POST, { method: 'POST', body: newBody }),
      call(PUT, { method: 'PUT', id: 1, body: newBody }),
      call(DELETE, { method: 'DELETE', id: 1 }),
    ])
    for (const r of results) expect(r.body.error.code).toBe('AUTH_UNAUTHORIZED')
  })

  it('GET（一覧・詳細）は一般ユーザーも可能', async () => {
    const customer = await createCustomer()
    expect((await call(list, { as: member })).status).toBe(200)
    expect((await call(getOne, { id: customer.id, as: member })).status).toBe(200)
  })

  it('POST / PUT / DELETE は一般ユーザーだと 403 で、データは変わらない', async () => {
    const customer = await createCustomer()
    const results = await Promise.all([
      call(POST, { method: 'POST', body: newBody, as: member }),
      call(PUT, { method: 'PUT', id: customer.id, body: newBody, as: member }),
      call(DELETE, { method: 'DELETE', id: customer.id, as: member }),
    ])
    for (const r of results) {
      expect(r.status).toBe(403)
      expect(r.body.error.code).toBe('FORBIDDEN')
    }
    expect(await prisma.customer.count()).toBe(1)
    expect(
      (await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).companyName,
    ).toBe('ABC商事')
  })
})

describe('GET /customers', () => {
  it('一覧を ID 順で返し、ページネーションを含む', async () => {
    await createCustomer('A社')
    await createCustomer('B社')
    const { status, body } = await call(list, { as: member })
    expect(status).toBe(200)
    expect(body.data.map((c: { company_name: string }) => c.company_name)).toEqual(['A社', 'B社'])
    expect(body.data[0]).toEqual({
      id: expect.any(Number),
      company_name: 'A社',
      contact_person: null,
      phone: null,
      email: null,
    })
    expect(body.pagination).toEqual({ total: 2, page: 1, per_page: 20, total_pages: 1 })
  })

  it('page / per_page で分割できる', async () => {
    for (const name of ['A社', 'B社', 'C社']) await createCustomer(name)
    const { body } = await call(list, { as: member, query: '?page=2&per_page=2' })
    expect(body.data.map((c: { company_name: string }) => c.company_name)).toEqual(['C社'])
    expect(body.pagination).toEqual({ total: 3, page: 2, per_page: 2, total_pages: 2 })
  })

  it('per_page が上限（100）を超える・0 以下なら 400', async () => {
    expect((await call(list, { as: member, query: '?per_page=101' })).status).toBe(400)
    expect((await call(list, { as: member, query: '?per_page=0' })).status).toBe(400)
  })

  it('search は会社名・担当者名の部分一致（大文字小文字を区別しない）', async () => {
    await prisma.customer.create({ data: { companyName: 'ABC商事', contactPerson: '佐藤一郎' } })
    await prisma.customer.create({ data: { companyName: 'XYZ工業', contactPerson: '鈴木二郎' } })
    const names = async (search: string) =>
      (
        await call(list, { as: member, query: `?search=${encodeURIComponent(search)}` })
      ).body.data.map((c: { company_name: string }) => c.company_name)

    expect(await names('商事')).toEqual(['ABC商事'])
    expect(await names('abc')).toEqual(['ABC商事'])
    expect(await names('鈴木')).toEqual(['XYZ工業'])
    expect(await names('該当なし')).toEqual([])
  })

  it('search の % と _ と \\ はワイルドカード・エスケープ文字ではなくリテラルとして扱う', async () => {
    await createCustomer('ABC商事')
    await createCustomer('C\\D社')
    await createCustomer('100%商店')
    await createCustomer('A_B社')
    const names = async (search: string) =>
      (
        await call(list, { as: member, query: `?search=${encodeURIComponent(search)}` })
      ).body.data.map((c: { company_name: string }) => c.company_name)

    expect(await names('%')).toEqual(['100%商店'])
    expect(await names('_')).toEqual(['A_B社'])
    expect(await names('\\')).toEqual(['C\\D社'])
  })

  it('SQL インジェクション文字列を検索してもエラーにならず、データも壊れない（TC-SEC-001）', async () => {
    await createCustomer()
    const { status, body } = await call(list, {
      as: member,
      query: `?search=${encodeURIComponent("'; DROP TABLE customer; --")}`,
    })
    expect(status).toBe(200)
    expect(body.data).toEqual([])
    expect(await prisma.customer.count()).toBe(1)
  })
})

describe('GET /customers/{id}', () => {
  it('詳細（address / created_at / updated_at 含む）を返す', async () => {
    const customer = await prisma.customer.create({
      data: { companyName: 'ABC商事', address: '東京都千代田区...' },
    })
    const { status, body } = await call(getOne, { id: customer.id, as: member })
    expect(status).toBe(200)
    expect(body).toMatchObject({
      id: customer.id,
      company_name: 'ABC商事',
      address: '東京都千代田区...',
    })
    expect(body.created_at).toMatch(/Z$/)
    expect(body.updated_at).toMatch(/Z$/)
  })

  it('存在しなければ 404、ID が不正なら 400', async () => {
    expect((await call(getOne, { id: 9999, as: member })).status).toBe(404)
    expect((await call(getOne, { id: 'abc', as: member })).status).toBe(400)
  })
})

describe('POST /customers', () => {
  it('201 で作成する', async () => {
    const { status, body } = await call(POST, { method: 'POST', body: newBody, as: admin })
    expect(status).toBe(201)
    expect(body).toMatchObject(newBody)
    expect(body.created_at).toMatch(/Z$/)
    expect(await prisma.customer.count()).toBe(1)
  })

  it('会社名だけでも作成でき、他の項目は null になる', async () => {
    const { status, body } = await call(POST, {
      method: 'POST',
      body: { company_name: 'ABC商事' },
      as: admin,
    })
    expect(status).toBe(201)
    expect(body).toMatchObject({
      contact_person: null,
      phone: null,
      email: null,
      address: null,
    })
  })

  it('TC-INT-002: 作成した顧客が一覧（顧客選択リスト）に表示される', async () => {
    const { body: created } = await call(POST, { method: 'POST', body: newBody, as: admin })
    const { body } = await call(list, { as: member })
    expect(body.data.map((c: { id: number }) => c.id)).toContain(created.id)
  })

  it('入力が不正なら 400（details 付き）', async () => {
    const { status, body } = await call(POST, {
      method: 'POST',
      body: { company_name: '', email: 'x' },
      as: admin,
    })
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'company_name',
      'email',
    ])
    expect(await prisma.customer.count()).toBe(0)
  })

  it('スクリプトタグはそのまま保存・返却する（エスケープは表示側の責務。TC-SEC-002）', async () => {
    const { body } = await call(POST, {
      method: 'POST',
      body: { company_name: "<script>alert('XSS')</script>" },
      as: admin,
    })
    expect(body.company_name).toBe("<script>alert('XSS')</script>")
  })
})

describe('PUT /customers/{id}', () => {
  it('更新できる。省略した任意項目は null になる', async () => {
    const customer = await prisma.customer.create({
      data: { companyName: 'ABC商事', phone: '03-0000-0000', address: '東京' },
    })
    const { status, body } = await call(PUT, {
      method: 'PUT',
      id: customer.id,
      body: { company_name: 'ABC商事（新）', contact_person: '佐藤一郎' },
      as: admin,
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({
      id: customer.id,
      company_name: 'ABC商事（新）',
      contact_person: '佐藤一郎',
      phone: null,
      address: null,
    })
    expect(body.updated_at).toMatch(/Z$/)
    const saved = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })
    expect(saved.companyName).toBe('ABC商事（新）')
    expect(saved.phone).toBeNull()
  })

  it('存在しなければ 404、入力が不正なら 400', async () => {
    expect((await call(PUT, { method: 'PUT', id: 9999, body: newBody, as: admin })).status).toBe(
      404,
    )
    const customer = await createCustomer()
    expect(
      (await call(PUT, { method: 'PUT', id: customer.id, body: { company_name: '' }, as: admin }))
        .status,
    ).toBe(400)
  })
})

describe('DELETE /customers/{id}', () => {
  it('参照がなければ 204 で物理削除する', async () => {
    const customer = await createCustomer()
    const { status } = await call(DELETE, { method: 'DELETE', id: customer.id, as: admin })
    expect(status).toBe(204)
    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).toBeNull()
  })

  it('訪問記録から参照されていれば 409 RESOURCE_IN_USE で、削除されない', async () => {
    const customer = await createCustomer()
    const report = await createReport(member.id)
    await prisma.visitRecord.create({
      data: { reportId: report.id, customerId: customer.id, visitContent: '提案' },
    })
    const { status, body } = await call(DELETE, { method: 'DELETE', id: customer.id, as: admin })
    expect(status).toBe(409)
    expect(body.error.code).toBe('RESOURCE_IN_USE')
    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).not.toBeNull()
  })

  it('存在しなければ 404', async () => {
    expect((await call(DELETE, { method: 'DELETE', id: 9999, as: admin })).status).toBe(404)
  })
})
