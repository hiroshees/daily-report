// @vitest-environment node
import { getClientIp, log } from '@/server/logger'
import { ApiError } from '@/server/errors'
import { defineRoute, type RouteContext } from '@/server/http'
import { getSession } from '@/server/session'

vi.mock('@/server/session', () => ({ getSession: vi.fn() }))

const NO_PARAMS: RouteContext = { params: Promise.resolve({}) }
const user = { id: 7, name: '山田', email: 'y@example.com', department: '営業', isManager: false }

let lines: Record<string, unknown>[]
beforeEach(() => {
  lines = []
  const capture = (line: string) => lines.push(JSON.parse(line))
  vi.spyOn(console, 'log').mockImplementation(capture)
  vi.spyOn(console, 'error').mockImplementation(capture)
  vi.mocked(getSession).mockResolvedValue({
    ok: true,
    user,
    token: { jti: 'j', expiresAt: new Date('2099-01-01') },
  })
})
afterEach(() => vi.restoreAllMocks())

describe('log', () => {
  it('1 行の JSON で level / message / time を出力する', () => {
    log('info', 'hello', { requestId: 'r1' })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ level: 'info', message: 'hello', requestId: 'r1' })
    expect(typeof lines[0]!.time).toBe('string')
  })

  it('機密キーの値は伏せる', () => {
    log('info', 'x', { password: 'p4ssw0rd!', token: 'jwt', Cookie: 'c', problem: '商談内容' })
    const out = JSON.stringify(lines[0])
    for (const secret of ['p4ssw0rd!', 'jwt', '商談内容']) expect(out).not.toContain(secret)
  })

  it('予約フィールドは fields で上書きできない', () => {
    log('info', 'real', { level: 'error', message: 'fake' })
    expect(lines[0]).toMatchObject({ level: 'info', message: 'real' })
  })
})

describe('getClientIp', () => {
  it('X-Forwarded-For の先頭を使う', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('1.1.1.1')
    expect(getClientIp(new Headers())).toBeNull()
  })
})

describe('defineRoute のアクセスログ', () => {
  it('必要項目を 1 行で出力し、ボディ・Cookie・トークンは含めない', async () => {
    const route = defineRoute({ handler: () => ({ ok: true }) })
    await route(
      new Request('http://localhost/api/v1/x?q=1', {
        headers: {
          'x-request-id': 'req-1',
          'x-forwarded-for': '9.9.9.9',
          'user-agent': 'vitest',
          cookie: 'session=secret-jwt',
          authorization: 'Bearer secret-jwt',
        },
      }),
      NO_PARAMS,
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      level: 'info',
      message: 'access',
      requestId: 'req-1',
      method: 'GET',
      path: '/api/v1/x',
      status: 200,
      userId: 7,
      ip: '9.9.9.9',
      userAgent: 'vitest',
    })
    expect(typeof lines[0]!.durationMs).toBe('number')
    expect(JSON.stringify(lines)).not.toContain('secret-jwt')
  })

  it('リクエストボディ（パスワード・本文）をログに出さない', async () => {
    const route = defineRoute({ auth: 'none', handler: () => ({}) })
    await route(
      new Request('http://localhost/api/v1/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'p4ssw0rd!', problem: '機密の課題' }),
      }),
      NO_PARAMS,
    )
    expect(JSON.stringify(lines)).not.toMatch(/p4ssw0rd|機密の課題/)
  })

  it('403 は warn のアクセスログと auth.forbidden の監査ログを出す', async () => {
    const route = defineRoute({ auth: 'manager', handler: () => ({}) })
    const res = await route(new Request('http://localhost/api/v1/x'), NO_PARAMS)
    expect(res.status).toBe(403)
    expect(lines.map((l) => l.message)).toEqual(['access', 'auth.forbidden'])
    expect(lines[0]).toMatchObject({ level: 'warn', status: 403, errorCode: 'FORBIDDEN' })
    expect(lines[1]!).toMatchObject({ audit: true, userId: 7 })
  })

  it('auditEvent は成功時のみ監査ログに記録する', async () => {
    const ok = defineRoute({ auditEvent: 'customer.update', handler: () => ({}) })
    await ok(new Request('http://localhost/api/v1/x', { method: 'PUT' }), NO_PARAMS)
    expect(lines.some((l) => l.message === 'customer.update' && l.audit === true)).toBe(true)

    lines.length = 0
    const ng = defineRoute({
      auditEvent: 'customer.update',
      handler: () => {
        throw new ApiError('NOT_FOUND')
      },
    })
    await ng(new Request('http://localhost/api/v1/x', { method: 'PUT' }), NO_PARAMS)
    expect(lines.some((l) => l.message === 'customer.update')).toBe(false)
  })

  it('想定外の例外は error レベルで出力する', async () => {
    const route = defineRoute({
      handler: () => {
        throw new Error('boom')
      },
    })
    const res = await route(new Request('http://localhost/api/v1/x'), NO_PARAMS)
    expect(res.status).toBe(500)
    expect(lines.find((l) => l.message === 'access')).toMatchObject({ level: 'error', status: 500 })
    expect(lines.some((l) => l.message === 'boom')).toBe(true)
  })
})
