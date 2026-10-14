import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NavLinks } from '@/components/layout/nav-links'
import { getNavItems } from '@/lib/navigation'
import type { SessionUser } from '@/lib/session'

type AppHeaderProps = {
  user: SessionUser
  /** ログアウト処理（Server Action）。form の action として実行される */
  logoutAction: () => void | Promise<void>
}

/** 認証後の全画面に共通のヘッダー（タイトル・ユーザー名・ログアウト・ナビゲーション） */
export function AppHeader({ user, logoutAction }: AppHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/reports" className="text-base font-bold sm:text-lg">
          営業日報システム
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground max-w-32 truncate text-sm sm:max-w-none">
            {user.name}
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
      <NavLinks items={getNavItems(user)} />
    </header>
  )
}
