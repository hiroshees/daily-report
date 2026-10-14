// @vitest-environment node
import bcrypt from 'bcryptjs'
import { DELETE, GET as getOne, PUT } from '@/app/api/v1/sales-persons/[id]/route'
import { GET as list, POST } from '@/app/api/v1/sales-persons/route'
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
    new Request(`http://localhost/api/v1/sales-persons${init.query ?? ''}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
    { params: Promise.resolve(init.id === undefined ? {} : { id: String(init.id) }) },
  )
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, text }
}

const newBody = {
  name: '鈴木次郎',
  email: 'suzuki@example.com',
  password: 'Password123',
  department: '営業2課',
  is_manager: false,
}
const updateBody = {
  name: '鈴木二郎',
  email: 'suzuki@example.com',
  department: '営業3課',
  is_manager: false,
}

let admin: { id: number }
let member: { id: number }

beforeEach(async () => {
  await resetDatabase()
  admin = await createSalesPerson({ email: 'admin@example.com', isManager: true })
  member = await createSalesPerson({ email: 'member@example.com' })
})
afterAll(() => prisma.$disconnect())

describe('認証・認可（全エンドポイントが管理者のみ）', () => {
  const cases: [
    string,
    () => ReturnType<typeof call>,
    () => ReturnType<typeof call>,
    () => ReturnType<typeof call>,
  ][] = [
    [
      'GET /sales-persons',
      () => call(list),
      () => call(list, { as: member }),
      () => call(list, { as: admin }),
    ],
    [
      'GET /sales-persons/{id}',
      () => call(getOne, { id: 1 }),
      () => call(getOne, { id: 1, as: member }),
      () => call(getOne, { id: member.id, as: admin }),
    ],
    [
      'POST /sales-persons',
      () => call(POST, { method: 'POST', body: newBody }),
      () => call(POST, { method: 'POST', body: newBody, as: member }),
      () => call(POST, { method: 'POST', body: newBody, as: admin }),
    ],
    [
      'PUT /sales-persons/{id}',
      () => call(PUT, { method: 'PUT', id: 1, body: updateBody }),
      () => call(PUT, { method: 'PUT', id: 1, body: updateBody, as: member }),
      () => call(PUT, { method: 'PUT', id: member.id, body: updateBody, as: admin }),
    ],
    [
      'DELETE /sales-persons/{id}',
      () => call(DELETE, { method: 'DELETE', id: 1 }),
      () => call(DELETE, { method: 'DELETE', id: 1, as: member }),
      () => call(DELETE, { method: 'DELETE', id: member.id, as: admin }),
    ],
  ]
  it.each(cases)(
    '%s: 未認証は 401、一般ユーザーは 403、管理者は成功',
    async (_name, anon, general, manager) => {
      expect((await anon()).body.error.code).toBe('AUTH_UNAUTHORIZED')
      expect((await general()).body.error.code).toBe('FORBIDDEN')
      expect((await manager()).status).toBeLessThan(300)
    },
  )
})

describe('GET /sales-persons', () => {
  it('一覧を返し、パスワードのハッシュは含めない', async () => {
    const { status, body, text } = await call(list, { as: admin })
    expect(status).toBe(200)
    expect(body.data).toEqual([
      {
        id: admin.id,
        name: '山田太郎',
        email: 'admin@example.com',
        department: '営業1課',
        is_manager: true,
      },
      {
        id: member.id,
        name: '山田太郎',
        email: 'member@example.com',
        department: '営業1課',
        is_manager: false,
      },
    ])
    expect(text).not.toMatch(/password|hash/i)
  })

  it('department と is_manager で絞り込める', async () => {
    await prisma.salesPerson.update({ where: { id: member.id }, data: { department: '営業2課' } })
    expect(
      (await call(list, { as: admin, query: '?department=営業2課' })).body.data.map(
        (p: { id: number }) => p.id,
      ),
    ).toEqual([member.id])
    expect(
      (await call(list, { as: admin, query: '?is_manager=true' })).body.data.map(
        (p: { id: number }) => p.id,
      ),
    ).toEqual([admin.id])
  })

  it('is_manager が true/false 以外なら 400', async () => {
    expect((await call(list, { as: admin, query: '?is_manager=yes' })).status).toBe(400)
  })
})

describe('GET /sales-persons/{id}', () => {
  it('詳細（created_at / updated_at 含む）を返す', async () => {
    const { status, body } = await call(getOne, { id: member.id, as: admin })
    expect(status).toBe(200)
    expect(body).toMatchObject({ id: member.id, email: 'member@example.com' })
    expect(body.created_at).toMatch(/Z$/)
    expect(body.updated_at).toMatch(/Z$/)
  })

  it('存在しなければ 404、ID が不正なら 400', async () => {
    expect((await call(getOne, { id: 9999, as: admin })).status).toBe(404)
    expect((await call(getOne, { id: 'abc', as: admin })).status).toBe(400)
  })
})

describe('POST /sales-persons', () => {
  it('201 で作成し、パスワードは bcrypt でハッシュ化して保存する', async () => {
    const { status, body, text } = await call(POST, { method: 'POST', body: newBody, as: admin })
    expect(status).toBe(201)
    expect(body).toMatchObject({
      name: '鈴木次郎',
      email: 'suzuki@example.com',
      department: '営業2課',
      is_manager: false,
    })
    expect(text).not.toMatch(/password|hash/i)

    const saved = await prisma.salesPerson.findUniqueOrThrow({ where: { id: body.id } })
    expect(saved.passwordHash).not.toBe(newBody.password)
    expect(await bcrypt.compare(newBody.password, saved.passwordHash)).toBe(true)
  })

  it('is_manager を省略すると一般ユーザーになる', async () => {
    const rest: Partial<typeof newBody> = { ...newBody }
    delete rest.is_manager
    const { body } = await call(POST, { method: 'POST', body: rest, as: admin })
    expect(body.is_manager).toBe(false)
  })

  it('メールアドレスは小文字に正規化して保存する（作成したユーザーはログインに使える形になる）', async () => {
    const { status, body } = await call(POST, {
      method: 'POST',
      body: { ...newBody, email: 'Suzuki@Example.COM' },
      as: admin,
    })
    expect(status).toBe(201)
    expect(body.email).toBe('suzuki@example.com')
  })

  it('メールアドレスが重複すると 409 DUPLICATE_EMAIL（大文字小文字違いも同一扱い）', async () => {
    const dup = await call(POST, {
      method: 'POST',
      body: { ...newBody, email: 'MEMBER@example.com' },
      as: admin,
    })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('DUPLICATE_EMAIL')
  })

  it('入力が不正なら 400（details 付き）', async () => {
    const { status, body } = await call(POST, {
      method: 'POST',
      body: { ...newBody, email: 'x', password: 'short', name: '' },
      as: admin,
    })
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'email',
      'name',
      'password',
    ])
  })
})

describe('PUT /sales-persons/{id}', () => {
  it('更新できる（パスワードは変更しない）', async () => {
    const before = await prisma.salesPerson.findUniqueOrThrow({ where: { id: member.id } })
    const { status, body } = await call(PUT, {
      method: 'PUT',
      id: member.id,
      body: { ...updateBody, is_manager: true },
      as: admin,
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({
      id: member.id,
      name: '鈴木二郎',
      department: '営業3課',
      is_manager: true,
    })
    expect(body.updated_at).toMatch(/Z$/)
    const after = await prisma.salesPerson.findUniqueOrThrow({ where: { id: member.id } })
    expect(after.passwordHash).toBe(before.passwordHash)
  })

  it('存在しなければ 404', async () => {
    expect((await call(PUT, { method: 'PUT', id: 9999, body: updateBody, as: admin })).status).toBe(
      404,
    )
  })

  it('他のユーザーのメールアドレスにすると 409 DUPLICATE_EMAIL', async () => {
    const { status, body } = await call(PUT, {
      method: 'PUT',
      id: member.id,
      body: { ...updateBody, email: 'admin@example.com' },
      as: admin,
    })
    expect(status).toBe(409)
    expect(body.error.code).toBe('DUPLICATE_EMAIL')
  })

  it('自分のメールアドレスのままなら重複扱いにならない', async () => {
    const { status } = await call(PUT, {
      method: 'PUT',
      id: member.id,
      body: { ...updateBody, email: 'member@example.com' },
      as: admin,
    })
    expect(status).toBe(200)
  })

  it('メールアドレスは小文字に正規化して保存する', async () => {
    const { body } = await call(PUT, {
      method: 'PUT',
      id: member.id,
      body: { ...updateBody, email: 'New@Example.com' },
      as: admin,
    })
    expect(body.email).toBe('new@example.com')
  })

  it('最後の管理者の降格は 409、他に管理者がいれば降格できる', async () => {
    const self = await call(PUT, {
      method: 'PUT',
      id: admin.id,
      body: { ...updateBody, email: 'admin@example.com' },
      as: admin,
    })
    expect(self.status).toBe(409)
    expect(self.body.error.code).toBe('RESOURCE_IN_USE')

    await call(PUT, {
      method: 'PUT',
      id: member.id,
      body: { ...updateBody, email: 'member@example.com', is_manager: true },
      as: admin,
    })
    const ok = await call(PUT, {
      method: 'PUT',
      id: admin.id,
      body: { ...updateBody, email: 'admin@example.com' },
      as: member,
    })
    expect(ok.status).toBe(200)
  })

  it('入力が不正なら 400', async () => {
    expect(
      (
        await call(PUT, {
          method: 'PUT',
          id: member.id,
          body: { ...updateBody, is_manager: 'yes' },
          as: admin,
        })
      ).status,
    ).toBe(400)
  })
})

describe('DELETE /sales-persons/{id}', () => {
  it('参照がなければ 204 で物理削除する', async () => {
    const { status } = await call(DELETE, { method: 'DELETE', id: member.id, as: admin })
    expect(status).toBe(204)
    expect(await prisma.salesPerson.findUnique({ where: { id: member.id } })).toBeNull()
  })

  it('存在しなければ 404', async () => {
    expect((await call(DELETE, { method: 'DELETE', id: 9999, as: admin })).status).toBe(404)
  })

  it('日報から参照されていれば 409 RESOURCE_IN_USE', async () => {
    await createReport(member.id)
    const { status, body } = await call(DELETE, { method: 'DELETE', id: member.id, as: admin })
    expect(status).toBe(409)
    expect(body.error.code).toBe('RESOURCE_IN_USE')
    expect(await prisma.salesPerson.findUnique({ where: { id: member.id } })).not.toBeNull()
  })

  it('コメントから参照されている管理者は 409 RESOURCE_IN_USE', async () => {
    const other = await createSalesPerson({ email: 'other@example.com', isManager: true })
    const report = await createReport(member.id)
    await prisma.managerComment.create({
      data: { reportId: report.id, managerId: other.id, comment: 'ok' },
    })
    const { status, body } = await call(DELETE, { method: 'DELETE', id: other.id, as: admin })
    expect(status).toBe(409)
    expect(body.error.code).toBe('RESOURCE_IN_USE')
  })

  it('自分自身は削除できない（409）', async () => {
    await createSalesPerson({ email: 'other@example.com', isManager: true })
    const { status, body } = await call(DELETE, { method: 'DELETE', id: admin.id, as: admin })
    expect(status).toBe(409)
    expect(body.error.code).toBe('RESOURCE_IN_USE')
  })

  it('他に管理者がいれば、管理者を削除できる', async () => {
    const other = await createSalesPerson({ email: 'other@example.com', isManager: true })
    expect((await call(DELETE, { method: 'DELETE', id: other.id, as: admin })).status).toBe(204)
  })

  // API を呼べるのは管理者だけなので、「最後の管理者」を他人が削除する経路はなく、
  // 唯一の管理者の削除は自己削除（409）として防がれる
  it('唯一の管理者は削除できない（409）', async () => {
    const { status } = await call(DELETE, { method: 'DELETE', id: admin.id, as: admin })
    expect(status).toBe(409)
    expect(await prisma.salesPerson.findUnique({ where: { id: admin.id } })).not.toBeNull()
  })

  it('顧客のみ参照するデータがあっても営業担当者の削除には影響しない', async () => {
    await createCustomer()
    expect((await call(DELETE, { method: 'DELETE', id: member.id, as: admin })).status).toBe(204)
  })
})
