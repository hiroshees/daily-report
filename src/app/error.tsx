'use client'

import { ErrorView } from '@/components/common/error-view'
import { Button } from '@/components/ui/button'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4">
      <ErrorView
        title="エラーが発生しました"
        message="時間をおいてもう一度お試しください。"
        action={<Button onClick={reset}>再試行</Button>}
      />
    </main>
  )
}
