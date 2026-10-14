import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type ErrorViewProps = {
  code?: string
  title: string
  message?: string
  /** 既定は日報一覧へ戻るリンク。独自の操作（再試行ボタンなど）を渡せる */
  action?: ReactNode
}

/** 404 / 403 / 想定外エラーなど、画面全体のエラー表示に使う共通コンポーネント */
export function ErrorView({ code, title, message, action }: ErrorViewProps) {
  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      {code && <p className="text-muted-foreground text-5xl font-bold">{code}</p>}
      <h1 className="text-xl font-bold">{title}</h1>
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
      <div className="mt-2">
        {action ?? (
          <Button asChild>
            <Link href="/reports">日報一覧へ戻る</Link>
          </Button>
        )}
      </div>
    </section>
  )
}

export function NotFoundView() {
  return (
    <ErrorView code="404" title="ページが見つかりません" message="お探しのページは存在しません。" />
  )
}

/** 権限エラー（SCREEN_DESIGN 6章のメッセージ） */
export function ForbiddenView() {
  return (
    <ErrorView code="403" title="アクセスできません" message="この操作を行う権限がありません" />
  )
}
