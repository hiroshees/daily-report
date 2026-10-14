import { randomUUID } from 'node:crypto'
import { errors, jwtVerify, SignJWT } from 'jose'
import { getAuthEnv } from '@/server/env'

const ALGORITHM = 'HS256'
const ISSUER = 'daily-report'

export type SessionToken = {
  token: string
  /** トークンごとの一意な ID（ログアウト時の失効に使う） */
  jti: string
  expiresAt: Date
}

export type TokenClaims = { userId: number; jti: string; expiresAt: Date }

export type VerifyResult =
  { ok: true; claims: TokenClaims } | { ok: false; reason: 'expired' | 'invalid' }

/** ログイン用の JWT（HS256）を発行する。`now` はテスト用 */
export async function signSessionToken(userId: number, now = new Date()): Promise<SessionToken> {
  const { secret, ttlSeconds } = getAuthEnv()
  const issuedAt = Math.floor(now.getTime() / 1000)
  const expiresAt = issuedAt + ttlSeconds
  const jti = randomUUID()

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(userId))
    .setIssuer(ISSUER)
    .setJti(jti)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secret)

  return { token, jti, expiresAt: new Date(expiresAt * 1000) }
}

/**
 * JWT を検証する。署名・アルゴリズム・発行者・有効期限を確認し、期限切れとそれ以外（改ざんなど）を区別する。
 * 環境変数が不正な場合は例外（設定ミスであり、トークンの問題ではないため）。
 */
export async function verifySessionToken(token: string, now = new Date()): Promise<VerifyResult> {
  const { secret } = getAuthEnv()

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      requiredClaims: ['sub', 'jti', 'exp'],
      currentDate: now,
    })

    const userId = Number(payload.sub)
    if (!Number.isInteger(userId) || userId <= 0 || !payload.jti || payload.jti.length > 64) {
      return { ok: false, reason: 'invalid' }
    }
    return {
      ok: true,
      claims: { userId, jti: payload.jti, expiresAt: new Date(payload.exp! * 1000) },
    }
  } catch (error) {
    return { ok: false, reason: error instanceof errors.JWTExpired ? 'expired' : 'invalid' }
  }
}
