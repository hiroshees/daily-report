import type { LoginResponse } from '@/schemas/auth'
import { LoginRequestSchema } from '@/schemas/auth'
import { buildSessionCookie } from '@/server/cookies'
import { ApiError } from '@/server/errors'
import { defineRoute } from '@/server/http'
import { issueSession, toCurrentUser, verifyCredentials } from '@/server/services/auth'

/**
 * ログイン。成功すると HttpOnly Cookie（ブラウザ用）を設定し、トークンもレスポンスに含める（API クライアントが
 * `Authorization: Bearer` で使う用）。ブラウザの画面側ではレスポンスのトークンは使わない。
 */
export const POST = defineRoute({
  auth: 'none',
  body: LoginRequestSchema,
  handler: async ({ body, audit }) => {
    const user = await verifyCredentials(body.email, body.password)
    if (!user) {
      // 失敗は理由を区別せず記録する（メールアドレス・パスワードはログに残さない）
      audit('auth.login.failure')
      throw new ApiError('AUTH_INVALID_CREDENTIALS')
    }

    const { token, expiresAt } = await issueSession(user.id)
    audit('auth.login.success', { userId: user.id })
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    const response: LoginResponse = {
      token,
      expires_at: expiresAt.toISOString().replace('.000Z', 'Z'),
      user: toCurrentUser(user),
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Set-Cookie': buildSessionCookie(token, maxAge) },
    })
  },
})
