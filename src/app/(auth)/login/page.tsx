import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { getSessionUser } from '@/lib/session'
import { safeRedirectPath } from '@/lib/redirect'

export const metadata = { title: 'ログイン | 営業日報システム' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>
}) {
  const { redirect: requested } = await searchParams
  // 外部サイトなどへの遷移（オープンリダイレクト）にならないよう、同一オリジンの相対パスだけにする
  const redirectTo = safeRedirectPath(Array.isArray(requested) ? requested[0] : requested)

  // ログイン済みなら遷移する。middleware ではなくここで行う理由は、DB で失効を確認できるため
  // （失効済みのトークンで /login ↔ 一覧を行き来する無限リダイレクトを避ける）
  if (await getSessionUser()) redirect(redirectTo)

  return <LoginForm redirectTo={redirectTo} />
}
