import { cn } from '@/lib/utils'

type FormErrorProps = {
  message?: string | null
  className?: string
}

/** フォーム全体に対するエラー（API エラーなど）の表示。項目単位のエラーは shadcn の FormMessage を使う */
export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <p
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm',
        className,
      )}
    >
      {message}
    </p>
  )
}
