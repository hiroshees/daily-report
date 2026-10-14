import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '営業日報システム',
  description: '営業担当者が日々の活動を報告し、上長がフィードバックを行うための日報管理システム',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // ブラウザ拡張機能が html/body に属性を付与しても hydration 警告を出さない（この2要素のみ有効）
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
