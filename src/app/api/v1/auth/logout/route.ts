import { clearSessionCookie } from '@/server/cookies'
import { defineRoute } from '@/server/http'
import { revokeSession } from '@/server/services/auth'

/**
 * ログアウト。トークンを失効させ、Cookie を削除する。
 * 期限切れなどでログイン状態でなくても Cookie は消せるよう、認証は必須にせず、何度呼んでも 204 を返す。
 */
export const POST = defineRoute({
  auth: 'none',
  handler: async ({ request, audit }) => {
    const userId = await revokeSession(request.headers)
    audit('auth.logout', { userId })
    return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie() } })
  },
})
