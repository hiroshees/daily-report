// @vitest-environment node
import { NextRequest } from 'next/server'
import { config, middleware } from '@/middleware'
import { signSessionToken } from '@/server/jwt'

const DAY_MS = 24 * 60 * 60 * 1000

function request(path: string, init: { method?: string; cookie?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? 'GET',
    headers: init.cookie ? { Cookie: init.cookie } : {},
  })
}

/** NextResponse.next()（そのまま通す）か */
const passesThrough = (response: Response) => response.headers.get('x-middleware-next') === '1'
const redirectsTo = (response: Response) => {
  const location = response.headers.get('location')
  return location ? new URL(location) : null
}

describe('middleware（未ログインのアクセスをログイン画面へ）', () => {
  it('未ログインで /reports を開くと /login へリダイレクトし、元の URL を redirect に残す', async () => {
    const response = await middleware(request('/reports'))

    expect(response.status).toBe(307)
    const location = redirectsTo(response)!
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('redirect')).toBe('/reports')
  })

  it('クエリ文字列も redirect に残す（Next.js 内部の _rsc は除く）', async () => {
    const response = await middleware(request('/reports?page=2&start_date=2025-07-01&_rsc=abc'))

    expect(redirectsTo(response)!.searchParams.get('redirect')).toBe(
      '/reports?page=2&start_date=2025-07-01',
    )
  })

  it('ルート（/）は redirect を付けずに /login へ', async () => {
    const location = redirectsTo(await middleware(request('/')))!

    expect(location.pathname).toBe('/login')
    expect(location.search).toBe('')
  })

  it('管理者専用ページ（/customers）も未ログインなら /login へ', async () => {
    const location = redirectsTo(await middleware(request('/customers')))!

    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('redirect')).toBe('/customers')
  })

  it('有効なトークンがあれば通す', async () => {
    const { token } = await signSessionToken(1)

    const response = await middleware(request('/reports', { cookie: `session=${token}` }))

    expect(passesThrough(response)).toBe(true)
  })

  it('/login は未ログインでも通す（リダイレクトの繰り返しにならない）', async () => {
    expect(passesThrough(await middleware(request('/login')))).toBe(true)
  })

  it('/login は、有効なトークンがあってもリダイレクトしない（失効済みのトークンで /login ↔ 一覧を繰り返さないため）', async () => {
    const { token } = await signSessionToken(1)

    const response = await middleware(request('/login', { cookie: `session=${token}` }))

    expect(passesThrough(response)).toBe(true)
  })

  it('期限切れのトークンは未ログイン扱いで、Cookie を削除する', async () => {
    const { token } = await signSessionToken(1, new Date(Date.now() - 2 * DAY_MS))

    const response = await middleware(request('/reports', { cookie: `session=${token}` }))

    expect(redirectsTo(response)!.pathname).toBe('/login')
    expect(response.headers.get('set-cookie')).toMatch(
      /session=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i,
    )
  })

  it('改ざんされたトークン・でたらめな Cookie も未ログイン扱い', async () => {
    const { token } = await signSessionToken(1)
    const [header, payload, signature] = token.split('.')
    const tampered = `${header}.${payload}.${signature!.slice(0, -2)}${signature!.endsWith('AA') ? 'BB' : 'AA'}`

    for (const value of [tampered, 'garbage', 'a.b.c']) {
      const response = await middleware(request('/reports', { cookie: `session=${value}` }))
      expect(redirectsTo(response)?.pathname, value).toBe('/login')
    }
  })

  it('Cookie が無ければ、削除の Set-Cookie は付けない', async () => {
    const response = await middleware(request('/reports'))
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('未ログインの POST（Server Action など）はリダイレクトせず 401', async () => {
    const response = await middleware(request('/reports', { method: 'POST' }))

    expect(response.status).toBe(401)
    expect(response.headers.get('location')).toBeNull()
  })

  it('ログイン済みの POST は通す', async () => {
    const { token } = await signSessionToken(1)

    const response = await middleware(
      request('/reports', { method: 'POST', cookie: `session=${token}` }),
    )

    expect(passesThrough(response)).toBe(true)
  })
})

describe('middleware の対象パス（matcher）', () => {
  // Next.js は matcher を path-to-regexp で解釈する。ここでは「先頭一致の否定先読み」の正規表現として検証する
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  it.each(['/', '/reports', '/reports/12', '/customers', '/sales-persons', '/login', '/forbidden'])(
    '%s は対象',
    (path) => {
      expect(matcher.test(path)).toBe(true)
    },
  )

  it.each([
    '/api/v1/auth/login',
    '/api/v1/reports',
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/icon.svg',
  ])('%s は対象外（API は各ルートで認証する。静的ファイルは認証不要）', (path) => {
    expect(matcher.test(path)).toBe(false)
  })
})
