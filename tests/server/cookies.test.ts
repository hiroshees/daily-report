import { buildSessionCookie, clearSessionCookie, readToken, SESSION_COOKIE } from '@/server/cookies'

const headers = (init: Record<string, string>) => new Headers(init)

describe('Cookie の発行', () => {
  it('HttpOnly・SameSite=Lax・Path=/・Max-Age を付ける', () => {
    const cookie = buildSessionCookie('abc.def.ghi', 86400, false)

    expect(cookie.split('; ')).toEqual([
      'session=abc.def.ghi',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=86400',
    ])
  })

  it('本番（secure）では Secure を付ける', () => {
    expect(buildSessionCookie('t', 60, true).split('; ')).toContain('Secure')
    expect(buildSessionCookie('t', 60, false).split('; ')).not.toContain('Secure')
  })

  it('Secure の既定は NODE_ENV=production のときだけ', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(buildSessionCookie('t', 60)).toContain('Secure')
    vi.stubEnv('NODE_ENV', 'development')
    expect(buildSessionCookie('t', 60)).not.toContain('Secure')
    vi.unstubAllEnvs()
  })

  it('削除用の Cookie は値が空で Max-Age=0（発行時と同じ属性）', () => {
    expect(clearSessionCookie(false).split('; ')).toEqual([
      'session=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
    ])
    expect(clearSessionCookie(true)).toContain('Secure')
  })
})

describe('トークンの取り出し', () => {
  it('Authorization: Bearer から取り出す（大文字小文字は問わない）', () => {
    expect(readToken(headers({ Authorization: 'Bearer abc.def' }))).toEqual({
      token: 'abc.def',
      source: 'authorization',
    })
    expect(readToken(headers({ Authorization: 'bearer abc' }))?.token).toBe('abc')
  })

  it('Cookie から取り出す（他の Cookie が混ざっていても）', () => {
    expect(readToken(headers({ Cookie: 'theme=dark; session=abc.def; lang=ja' }))).toEqual({
      token: 'abc.def',
      source: 'cookie',
    })
  })

  it('両方ある場合は Authorization を優先する', () => {
    const result = readToken(
      headers({ Authorization: 'Bearer from-header', Cookie: 'session=from-cookie' }),
    )
    expect(result).toEqual({ token: 'from-header', source: 'authorization' })
  })

  it('名前が前方一致するだけの Cookie は無視する', () => {
    expect(readToken(headers({ Cookie: 'xsession=abc; session_id=def' }))).toBeNull()
  })

  it.each([
    ['ヘッダーなし', {}],
    ['Bearer の値が空', { Authorization: 'Bearer ' }],
    ['Basic 認証', { Authorization: 'Basic dXNlcjpwYXNz' }],
    ['Cookie の値が空（削除済み）', { Cookie: `${SESSION_COOKIE}=` }],
    ['= が無い Cookie', { Cookie: 'session' }],
  ])('%s は null', (_name, init) => {
    expect(readToken(headers(init))).toBeNull()
  })

  it('Bearer が不正でも、Cookie があれば Cookie を使う', () => {
    expect(readToken(headers({ Authorization: 'Basic xxx', Cookie: 'session=abc' }))?.token).toBe(
      'abc',
    )
  })
})
