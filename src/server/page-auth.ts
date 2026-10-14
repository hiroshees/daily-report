import { redirect } from 'next/navigation'
import { getSessionUser, type SessionUser } from '@/lib/session'

/**
 * ページ（Server Component）でログインを必須にする。未ログインならログイン画面へ。
 * middleware は署名と期限しか見ないため、ユーザーの存在・失効の確認はここで行う。
 */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

/**
 * 管理者専用ページ用。未ログインならログイン画面へ、一般ユーザーなら `allowed: false`。
 * 呼び出し側は、`allowed` でなければ `ForbiddenView` を返す（ナビのリンクを隠すだけでは、URL 直打ちを防げない）。
 */
export async function requireManagerPage(): Promise<{ allowed: boolean; user: SessionUser }> {
  const user = await requirePageUser()
  return { allowed: user.isManager, user }
}
