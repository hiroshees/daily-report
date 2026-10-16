import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { SalesPerson } from '@prisma/client'
import type { SessionUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { readToken } from '@/server/cookies'
import { signSessionToken, verifySessionToken } from '@/server/jwt'
import type { CurrentUser } from '@/schemas/auth'

/** シードと同じコスト。ユーザーが存在しないときも同じ時間がかかるようにするため揃える */
const BCRYPT_ROUNDS = 10

let dummyHash: Promise<string> | undefined
/** 存在しないメールアドレスでも bcrypt の比較を行うためのダミー（応答時間でユーザーの有無が分からないようにする） */
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomUUID(), BCRYPT_ROUNDS))

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

/**
 * メールアドレスとパスワードを検証する。失敗の理由（メールが無い／パスワード違い）は区別しない。
 * メールアドレスは小文字に揃えて照合する（登録時も小文字で保存すること）。
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SalesPerson | null> {
  const user = await prisma.salesPerson.findUnique({ where: { email: normalizeEmail(email) } })
  const matches = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()))
  return user && matches ? user : null
}

/** ログイン済みユーザーを API のレスポンス形式にする（パスワードのハッシュなどは含めない） */
export function toCurrentUser(user: SessionUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    is_manager: user.isManager,
  }
}

/** ログイン用のトークンを発行する */
export function issueSession(userId: number) {
  return signSessionToken(userId)
}

/**
 * リクエストに含まれるトークンを失効させる（ログアウト）。
 * 何度呼んでも、トークンが無い・無効でもエラーにしない（冪等）。
 * あわせて、有効期限が切れた失効記録を削除する（期限切れのトークンは署名検証で弾かれるため不要）。
 */
export async function revokeSession(headers: Headers, now = new Date()): Promise<number | null> {
  const credentials = readToken(headers)
  if (!credentials) return null

  const verified = await verifySessionToken(credentials.token, now)
  if (verified.ok) {
    const { jti, expiresAt } = verified.claims
    await prisma.revokedToken.upsert({
      where: { jti },
      create: { jti, expiresAt },
      update: {},
    })
  }
  await prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: now } } })
  // 監査ログ用に、トークンが有効だった場合のユーザーIDを返す
  return verified.ok ? verified.claims.userId : null
}
