import { headers } from 'next/headers'
import { getSession } from '@/server/session'

export type SessionUser = {
  id: number
  name: string
  email: string
  department: string
  isManager: boolean
}

/**
 * ログイン中のユーザーを返す。未ログイン・期限切れ・失効済みは null。
 * Server Component / Server Action から使う（Route Handler は `requireAuth(request)`）。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession(await headers())
  return session.ok ? session.user : null
}
