import type { ReactNode } from 'react'
import { CurrentUserProvider } from '@/components/auth/current-user-provider'
import { AppHeader } from '@/components/layout/app-header'
import { requirePageUser } from '@/server/page-auth'
import { logoutAction } from '@/app/(app)/actions'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // middleware（署名・期限）に加えて、DB でユーザーの存在と失効を確認する多重防御。
  // ただしクライアント遷移ではレイアウトが再実行されないため、データを扱う各ページでも確認すること
  const user = await requirePageUser()

  return (
    <CurrentUserProvider user={user}>
      <div className="flex min-h-dvh flex-col">
        <AppHeader user={user} logoutAction={logoutAction} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </div>
    </CurrentUserProvider>
  )
}
