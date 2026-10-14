import type { SessionUser } from '@/lib/session'
import { readToken } from '@/server/cookies'
import { verifySessionToken } from '@/server/jwt'
import { prisma } from '@/lib/prisma'

export type SessionFailure = 'missing' | 'expired' | 'invalid'

export type Session =
  | { ok: true; user: SessionUser; token: { jti: string; expiresAt: Date } }
  | { ok: false; reason: SessionFailure }

/**
 * リクエストのヘッダーからログイン状態を判定する。
 * 署名・有効期限の検証に加えて、毎回 DB で「ユーザーが存在するか」「トークンが失効していないか」を確認する。
 * （管理者フラグの変更やユーザー削除、ログアウトが、有効期限を待たずに反映される）
 */
export async function getSession(headers: Headers): Promise<Session> {
  const credentials = readToken(headers)
  if (!credentials) return { ok: false, reason: 'missing' }

  const verified = await verifySessionToken(credentials.token)
  if (!verified.ok) return { ok: false, reason: verified.reason }
  const { userId, jti, expiresAt } = verified.claims

  const [user, revoked] = await Promise.all([
    prisma.salesPerson.findUnique({ where: { id: userId } }),
    prisma.revokedToken.findUnique({ where: { jti } }),
  ])
  if (!user || revoked) return { ok: false, reason: 'invalid' }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      isManager: user.isManager,
    },
    token: { jti, expiresAt },
  }
}
