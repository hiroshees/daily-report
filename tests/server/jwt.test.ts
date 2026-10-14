// @vitest-environment node
import { SignJWT } from 'jose'
import { getAuthEnv } from '@/server/env'
import { signSessionToken, verifySessionToken } from '@/server/jwt'

const NOW = new Date('2025-07-27T09:00:00Z')
const TTL = 86400 // 既定 24h

const secret = () => getAuthEnv().secret
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000)

afterEach(() => vi.unstubAllEnvs())

describe('JWT の発行', () => {
  it('ユーザー ID・一意な jti・有効期限を持つトークンを返す', async () => {
    const { token, jti, expiresAt } = await signSessionToken(42, NOW)

    expect(token.split('.')).toHaveLength(3)
    expect(jti).toMatch(/^[0-9a-f-]{36}$/)
    expect(expiresAt).toEqual(at(TTL))

    const verified = await verifySessionToken(token, NOW)
    expect(verified).toEqual({ ok: true, claims: { userId: 42, jti, expiresAt } })
  })

  it('発行のたびに jti が異なる', async () => {
    const a = await signSessionToken(1, NOW)
    const b = await signSessionToken(1, NOW)
    expect(a.jti).not.toBe(b.jti)
  })

  it('JWT_EXPIRES_IN で有効期間を変えられる', async () => {
    vi.stubEnv('JWT_EXPIRES_IN', '30m')
    const { expiresAt } = await signSessionToken(1, NOW)
    expect(expiresAt).toEqual(at(1800))
  })

  it('ペイロードにメールアドレスや権限などの個人情報を含めない', async () => {
    const { token } = await signSessionToken(1, NOW)
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString())

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'iss', 'jti', 'sub'])
  })
})

describe('JWT の検証（TC-SEC-003）', () => {
  it('有効期限の直前までは有効、期限を過ぎると expired', async () => {
    const { token } = await signSessionToken(1, NOW)

    expect((await verifySessionToken(token, at(TTL - 1))).ok).toBe(true)
    expect(await verifySessionToken(token, at(TTL))).toEqual({ ok: false, reason: 'expired' })
    expect(await verifySessionToken(token, at(TTL + 3600))).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('改ざんされたトークンは invalid（署名・ペイロードのどちらを変えても）', async () => {
    const { token } = await signSessionToken(1, NOW)
    const [header, payload, signature] = token.split('.')

    const flipped = `${signature!.slice(0, -2)}${signature!.endsWith('AA') ? 'BB' : 'AA'}`
    const otherPayload = base64url({
      ...JSON.parse(Buffer.from(payload!, 'base64url').toString()),
      sub: '2',
    })

    expect(await verifySessionToken(`${header}.${payload}.${flipped}`, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(await verifySessionToken(`${header}.${otherPayload}.${signature}`, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('別の秘密鍵で署名されたトークンは invalid', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    const { token } = await signSessionToken(1, NOW)
    vi.unstubAllEnvs()

    expect(await verifySessionToken(token, NOW)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('署名なし（alg: none）のトークンは invalid', async () => {
    const header = base64url({ alg: 'none', typ: 'JWT' })
    const payload = base64url({
      sub: '1',
      jti: 'x',
      iss: 'daily-report',
      exp: Math.floor(NOW.getTime() / 1000) + 3600,
    })

    expect(await verifySessionToken(`${header}.${payload}.`, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('HS256 以外のアルゴリズムは、同じ秘密鍵で署名されていても invalid', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS512' })
      .setSubject('1')
      .setJti('x')
      .setIssuer('daily-report')
      .setExpirationTime(Math.floor(NOW.getTime() / 1000) + 3600)
      .sign(secret())

    expect(await verifySessionToken(token, NOW)).toEqual({ ok: false, reason: 'invalid' })
  })

  it.each([
    ['発行者が違う', (jwt: SignJWT) => jwt.setIssuer('someone-else').setSubject('1').setJti('x')],
    ['sub が無い', (jwt: SignJWT) => jwt.setIssuer('daily-report').setJti('x')],
    ['jti が無い', (jwt: SignJWT) => jwt.setIssuer('daily-report').setSubject('1')],
    [
      'sub が数値でない',
      (jwt: SignJWT) => jwt.setIssuer('daily-report').setSubject('abc').setJti('x'),
    ],
    ['sub が 0', (jwt: SignJWT) => jwt.setIssuer('daily-report').setSubject('0').setJti('x')],
    [
      'jti が長すぎる',
      (jwt: SignJWT) => jwt.setIssuer('daily-report').setSubject('1').setJti('j'.repeat(65)),
    ],
  ])('署名が正しくても、%s トークンは invalid', async (_name, configure) => {
    const jwt = configure(
      new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(Math.floor(NOW.getTime() / 1000) + 3600),
    )

    expect(await verifySessionToken(await jwt.sign(secret()), NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('exp が無いトークンは invalid（無期限のトークンを受け付けない）', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('1')
      .setJti('x')
      .setIssuer('daily-report')
      .sign(secret())

    expect(await verifySessionToken(token, NOW)).toEqual({ ok: false, reason: 'invalid' })
  })

  it.each(['', 'abc', 'a.b.c', 'a.b', '....'])(
    '壊れたトークン %j は invalid（例外にならない）',
    async (token) => {
      expect(await verifySessionToken(token, NOW)).toEqual({ ok: false, reason: 'invalid' })
    },
  )

  it('環境変数（JWT_SECRET）が不正な場合は、invalid ではなく設定エラーとして例外にする', async () => {
    vi.stubEnv('JWT_SECRET', 'short')
    await expect(verifySessionToken('abc', NOW)).rejects.toThrow('JWT_SECRET')
  })
})
