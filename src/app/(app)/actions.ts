'use server'

import { redirect } from 'next/navigation'

/**
 * ログアウト。
 * TODO(#8): POST /auth/logout 相当の処理（トークン Cookie の削除・無効化）を行ってから遷移する。
 */
export async function logoutAction() {
  redirect('/login')
}
