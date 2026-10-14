'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE } from '@/server/cookies'
import { revokeSession } from '@/server/services/auth'

/** ログアウト。トークンを失効させ、Cookie を削除してからログイン画面へ遷移する */
export async function logoutAction() {
  await revokeSession(await headers())
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}
