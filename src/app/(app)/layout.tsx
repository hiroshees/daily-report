import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { getSessionUser } from '@/lib/session'
import { logoutAction } from '@/app/(app)/actions'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  // TODO(#8): 未認証のリダイレクトは middleware で行う。ここは多重防御として残す
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} logoutAction={logoutAction} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
