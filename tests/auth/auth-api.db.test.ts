// @vitest-environment node
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { POST as login } from '@/app/api/v1/auth/login/route'
import { POST as logout } from '@/app/api/v1/auth/logout/route'
import { GET as me } from '@/app/api/v1/auth/me/route'
import { prisma } from '@/lib/prisma'
import { getAuthEnv } from '@/server/env'
import { defineRoute } from '@/server/http'
import { signSessionToken } from '@/server/jwt'
import { resetDatabase } from '../db/helpers'

const PASSWORD = 'Test1234!'
const NO_PARAMS = { params: Promise.resolve({}) }
const DAY_MS = 24 * 60 * 60 * 1000

type Handler = (request: Request, context: typeof NO_PARAMS) => Promise<Response>

const call = (
  handler: Handler,
  init: { method?: string; headers?: HeadersInit; body?: unknown } = {},
) =>
  handler(
    new Request('http://localhost/api/v1/auth', {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...init.headers },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
    NO_PARAMS,
  )

const doLogin = (email: string, password: string) =>
  call(login as Handler, { method: 'POST', body: { email, password } })

const cookieOf = (response: Response) =>
  /^session=([^;]*)/.exec(response.headers.get('set-cookie') ?? '')?.[1]

async function createUser(email: string, overrides: { isManager?: boolean; name?: string } = {}) {
  return prisma.salesPerson.create({
    data: {
      name: overrides.name ?? '山田太郎',
      email,
      // テストの速度のため bcrypt のコストを下げる（検証はどのコストでも同じ）
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      department: '営業1課',
      isManager: overrides.isManager ?? false,
    },
  })
}

/** ログインしてトークン（レスポンスと Cookie の両方）を返す */
async function loginAs(email: string) {
  const response = await doLogin(email, PASSWORD)
  expect(response.status).toBe(200)
  const body = await response.json()
  return { token: body.token as string, response, body }
}

beforeEach(resetDatabase)
afterEach(() => vi.restoreAllMocks())
afterAll(() => prisma.$disconnect())

describe('POST /auth/login（TC-AUTH-001: ログイン成功）', () => {
  it('ユーザー情報とトークンを返し、HttpOnly Cookie を設定する', async () => {
    const user = await createUser('yamada@example.com')

    const { response, body, token } = await loginAs('yamada@example.com')

    expect(body).toEqual({
      token: expect.any(String),
      expires_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
      user: {
        id: user.id,
        name: '山田太郎',
        email: 'yamada@example.com',
        department: '営業1課',
        is_manager: false,
      },
    })

    const cookie = response.headers.get('set-cookie')!
    expect(cookieOf(response)).toBe(token)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookie)![1])
    expect(Math.abs(maxAge - getAuthEnv().ttlSeconds)).toBeLessThan(5)

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })

  it('有効期限（expires_at）は現在から有効期間後', async () => {
    await createUser('yamada@example.com')

    const { body } = await loginAs('yamada@example.com')

    const remaining = new Date(body.expires_at).getTime() - Date.now()
    expect(Math.abs(remaining - getAuthEnv().ttlSeconds * 1000)).toBeLessThan(5000)
  })

  it('メールアドレスの大文字小文字は区別しない', async () => {
    await createUser('yamada@example.com')

    expect((await doLogin('Yamada@Example.COM', PASSWORD)).status).toBe(200)
  })

  it('管理者は is_manager: true で返る', async () => {
    await createUser('tanaka@example.com', { isManager: true, name: '田中部長' })

    const { body } = await loginAs('tanaka@example.com')

    expect(body.user).toMatchObject({ name: '田中部長', is_manager: true })
  })

  it('パスワードやそのハッシュを、レスポンスのどこにも含めない', async () => {
    const user = await createUser('yamada@example.com')

    const response = await doLogin('yamada@example.com', PASSWORD)
    const text = JSON.stringify(await response.json()) + [...response.headers].flat().join('\n')

    expect(text).not.toContain(PASSWORD)
    expect(text).not.toContain(user.passwordHash)
    expect(text).not.toMatch(/\$2[aby]\$/)
    expect(text.toLowerCase()).not.toContain('password')
  })

  it('パスワードやそのハッシュをログに出さない', async () => {
    const user = await createUser('yamada@example.com')
    const spies = (['log', 'info', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    )

    await doLogin('yamada@example.com', PASSWORD)
    await doLogin('yamada@example.com', 'WrongPass1')
    await doLogin('nobody@example.com', PASSWORD)

    const logged = spies
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .join('\n')
    expect(logged).not.toContain(PASSWORD)
    expect(logged).not.toContain(user.passwordHash)
  })
})

describe('POST /auth/login（TC-AUTH-002: 失敗）', () => {
  it('パスワード誤りは 401 AUTH_INVALID_CREDENTIALS、Cookie は設定しない', async () => {
    await createUser('yamada@example.com')

    const response = await doLogin('yamada@example.com', 'WrongPass')

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'メールアドレスまたはパスワードが正しくありません',
      },
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('存在しないメールアドレスも、パスワード誤りと同じレスポンス（ユーザーの有無が分からない）', async () => {
    await createUser('yamada@example.com')

    const wrongPassword = await doLogin('yamada@example.com', 'WrongPass1')
    const unknownUser = await doLogin('nobody@example.com', PASSWORD)

    expect(unknownUser.status).toBe(wrongPassword.status)
    expect(await unknownUser.json()).toEqual(await wrongPassword.json())
    expect(unknownUser.headers.get('set-cookie')).toBeNull()
  })

  it('存在しないメールアドレスでも bcrypt の比較を行う（応答時間で区別できない）', async () => {
    await createUser('yamada@example.com')
    const compare = vi.spyOn(bcrypt, 'compare')

    await doLogin('yamada@example.com', 'WrongPass1')
    await doLogin('nobody@example.com', 'WrongPass1')

    expect(compare).toHaveBeenCalledTimes(2)
    // ダミーのハッシュ（bcrypt 形式）と比較している
    expect(compare.mock.calls[1]![1]).toMatch(/^\$2[aby]\$\d{2}\$/)
  })
})

describe('POST /auth/login（TC-AUTH-003: 入力が不正）', () => {
  it('メールアドレスの形式が不正なら 400（認証は行わない）', async () => {
    const compare = vi.spyOn(bcrypt, 'compare')

    const response = await doLogin('invalid-email', PASSWORD)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: '入力値が不正です',
      details: [{ field: 'email', message: 'メールアドレスの形式が正しくありません' }],
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('パスワードが 8 文字未満・未入力なら 400', async () => {
    const short = await doLogin('yamada@example.com', '1234567')
    expect((await short.json()).error.details).toEqual([
      { field: 'password', message: 'パスワードは8文字以上で入力してください' },
    ])

    const missing = await call(login as Handler, {
      method: 'POST',
      body: { email: 'yamada@example.com' },
    })
    expect(missing.status).toBe(400)
  })
})

describe('GET /auth/me', () => {
  it('Cookie で認証できる', async () => {
    const user = await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    const response = await call(me as Handler, { headers: { Cookie: `session=${token}` } })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: user.id,
      name: '山田太郎',
      email: 'yamada@example.com',
      department: '営業1課',
      is_manager: false,
    })
  })

  it('Authorization: Bearer でも認証できる', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    const response = await call(me as Handler, { headers: { Authorization: `Bearer ${token}` } })

    expect(response.status).toBe(200)
  })

  it('Cookie と Bearer の両方がある場合は Bearer を優先する', async () => {
    await createUser('yamada@example.com')
    await createUser('tanaka@example.com', { name: '田中部長', isManager: true })
    const yamada = await loginAs('yamada@example.com')
    const tanaka = await loginAs('tanaka@example.com')

    const response = await call(me as Handler, {
      headers: { Cookie: `session=${yamada.token}`, Authorization: `Bearer ${tanaka.token}` },
    })

    expect((await response.json()).name).toBe('田中部長')
  })

  it('トークンが無ければ 401 AUTH_UNAUTHORIZED', async () => {
    const response = await call(me as Handler)

    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('AUTH_UNAUTHORIZED')
  })

  it('パスワードのハッシュを含めない', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    const text = await (
      await call(me as Handler, { headers: { Cookie: `session=${token}` } })
    ).text()

    expect(text).not.toMatch(/\$2[aby]\$/)
    expect(text).not.toContain('password')
  })
})

describe('不正なトークン（TC-SEC-003: 401 を返す）', () => {
  const meWith = (token: string) =>
    call(me as Handler, { headers: { Authorization: `Bearer ${token}` } })
  const errorCode = async (response: Response) => (await response.json()).error.code

  it('期限切れのトークンは 401 AUTH_TOKEN_EXPIRED', async () => {
    const user = await createUser('yamada@example.com')
    const { token } = await signSessionToken(user.id, new Date(Date.now() - 2 * DAY_MS))

    const response = await meWith(token)

    expect(response.status).toBe(401)
    expect(await errorCode(response)).toBe('AUTH_TOKEN_EXPIRED')
  })

  it('改ざんされたトークンは 401 AUTH_UNAUTHORIZED', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')
    const [header, payload, signature] = token.split('.')
    const tampered = `${header}.${payload}.${signature!.slice(0, -2)}${signature!.endsWith('AA') ? 'BB' : 'AA'}`

    const response = await meWith(tampered)

    expect(response.status).toBe(401)
    expect(await errorCode(response)).toBe('AUTH_UNAUTHORIZED')
  })

  it('別のユーザー ID に書き換えたトークンは 401', async () => {
    const yamada = await createUser('yamada@example.com')
    const tanaka = await createUser('tanaka@example.com', { isManager: true })
    const { token } = await loginAs('yamada@example.com')
    const [header, payload, signature] = token.split('.')
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString())
    expect(claims.sub).toBe(String(yamada.id))
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: String(tanaka.id) })).toString(
      'base64url',
    )

    expect((await meWith(`${header}.${forged}.${signature}`)).status).toBe(401)
  })

  it('別の秘密鍵で署名したトークン・署名なしトークン・でたらめな文字列は 401', async () => {
    const user = await createUser('yamada@example.com')
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuer('daily-report')
      .setJti('x')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-completely-different-secret-0123456789'))
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(`{"sub":"${user.id}"}`).toString('base64url')}.`

    for (const token of [foreign, none, 'abc', 'a.b.c']) {
      const response = await meWith(token)
      expect(response.status, token).toBe(401)
      expect(await errorCode(response), token).toBe('AUTH_UNAUTHORIZED')
    }
  })

  it('削除されたユーザーのトークンは 401', async () => {
    const user = await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')
    await prisma.salesPerson.delete({ where: { id: user.id } })

    const response = await meWith(token)

    expect(response.status).toBe(401)
    expect(await errorCode(response)).toBe('AUTH_UNAUTHORIZED')
  })
})

describe('ユーザーの変更が、ログイン中のトークンにも即時に反映される', () => {
  const managerOnly = defineRoute({ auth: 'manager', handler: ({ user }) => ({ name: user.name }) })
  const callManagerOnly = (token: string) =>
    call(managerOnly as Handler, { headers: { Cookie: `session=${token}` } })

  it('管理者に昇格・降格すると、再ログインしなくても権限が変わる', async () => {
    const user = await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    expect((await callManagerOnly(token)).status).toBe(403)

    await prisma.salesPerson.update({ where: { id: user.id }, data: { isManager: true } })
    expect((await callManagerOnly(token)).status).toBe(200)

    await prisma.salesPerson.update({ where: { id: user.id }, data: { isManager: false } })
    expect((await callManagerOnly(token)).status).toBe(403)
  })
})

describe('POST /auth/logout', () => {
  const logoutWith = (headers: HeadersInit = {}) =>
    call(logout as Handler, { method: 'POST', headers })
  const meWith = (token: string) => call(me as Handler, { headers: { Cookie: `session=${token}` } })

  it('204 を返し、Cookie を削除する', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    const response = await logoutWith({ Cookie: `session=${token}` })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    const cookie = response.headers.get('set-cookie')!
    expect(cookieOf(response)).toBe('')
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('HttpOnly')
  })

  it('ログアウトしたトークンは、有効期限内でも使えなくなる（Cookie でも Bearer でも）', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')
    expect((await meWith(token)).status).toBe(200)

    await logoutWith({ Cookie: `session=${token}` })

    expect((await meWith(token)).status).toBe(401)
    expect(
      (await call(me as Handler, { headers: { Authorization: `Bearer ${token}` } })).status,
    ).toBe(401)
    expect(await prisma.revokedToken.count()).toBe(1)
  })

  it('Bearer のトークンでもログアウトできる', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    await logoutWith({ Authorization: `Bearer ${token}` })

    expect((await meWith(token)).status).toBe(401)
  })

  it('他のトークン（別の端末・別のユーザー）には影響しない', async () => {
    await createUser('yamada@example.com')
    await createUser('tanaka@example.com', { isManager: true })
    const first = await loginAs('yamada@example.com')
    const second = await loginAs('yamada@example.com') // 同じユーザーの別の端末
    const other = await loginAs('tanaka@example.com')

    await logoutWith({ Cookie: `session=${first.token}` })

    expect((await meWith(first.token)).status).toBe(401)
    expect((await meWith(second.token)).status).toBe(200)
    expect((await meWith(other.token)).status).toBe(200)
  })

  it('ログイン状態でなくても 204 を返し、Cookie を削除する（何度呼んでもよい）', async () => {
    const cases: Record<string, string>[] = [
      {},
      { Cookie: 'session=garbage' },
      { Authorization: 'Bearer abc.def.ghi' },
    ]
    for (const headers of cases) {
      const response = await logoutWith(headers)

      expect(response.status).toBe(204)
      expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    }
    expect(await prisma.revokedToken.count()).toBe(0)
  })

  it('同じトークンで 2 回ログアウトしても 204（失効記録は 1 件）', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    expect((await logoutWith({ Cookie: `session=${token}` })).status).toBe(204)
    expect((await logoutWith({ Cookie: `session=${token}` })).status).toBe(204)
    expect(await prisma.revokedToken.count()).toBe(1)
  })

  it('期限切れの失効記録を削除する（テーブルが増え続けない）', async () => {
    await createUser('yamada@example.com')
    await prisma.revokedToken.createMany({
      data: [
        { jti: 'expired-1', expiresAt: new Date(Date.now() - DAY_MS) },
        { jti: 'still-valid', expiresAt: new Date(Date.now() + DAY_MS) },
      ],
    })
    const { token } = await loginAs('yamada@example.com')

    await logoutWith({ Cookie: `session=${token}` })

    const remaining = (await prisma.revokedToken.findMany()).map((row) => row.jti)
    expect(remaining).toContain('still-valid')
    expect(remaining).not.toContain('expired-1')
    expect(remaining).toHaveLength(2) // still-valid + 今回のトークン
  })

  it('他のサイトからのログアウト要求（Origin が別）は 403 で、トークンは失効しない（CSRF）', async () => {
    await createUser('yamada@example.com')
    const { token } = await loginAs('yamada@example.com')

    const response = await logoutWith({
      Cookie: `session=${token}`,
      Origin: 'https://evil.example.com',
      Host: 'localhost:3000',
    })

    expect(response.status).toBe(403)
    expect((await meWith(token)).status).toBe(200)
  })
})
