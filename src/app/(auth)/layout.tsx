import type { ReactNode } from 'react'

/** ログイン画面用: ヘッダーなしで中央に配置する */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
