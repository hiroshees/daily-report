'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/common/form-error'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  COMMENT_MAX_LENGTH,
  CommentCreateRequestSchema,
  type CommentCreateRequest,
} from '@/schemas/comment'
import { countChars } from '@/schemas/fields'

const GENERIC_ERROR = 'コメントの投稿に失敗しました。時間をおいてもう一度お試しください。'

/** 上長コメントの投稿フォーム（管理者のみ表示）。投稿後は画面を再取得して一覧に反映する */
export function CommentForm({ reportId }: { reportId: number }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const form = useForm<CommentCreateRequest>({
    resolver: zodResolver(CommentCreateRequestSchema),
    // 入力のたびに検証し、不正な間は投稿ボタンを押せないようにする
    mode: 'onChange',
    defaultValues: { comment: '' },
  })
  const { isSubmitting, isValid } = form.formState
  const count = countChars(form.watch('comment'))

  async function onSubmit(values: CommentCreateRequest) {
    // 二重投稿の防止（state は再描画まで反映されないため ref で判定する）
    if (submittingRef.current) return
    submittingRef.current = true
    setFormError(null)
    try {
      const { response, error } = await apiClient.POST('/reports/{id}/comments', {
        params: { path: { id: reportId } },
        body: values,
      })

      if (response.ok) {
        toast.success('コメントを投稿しました')
        form.reset({ comment: '' })
        router.refresh()
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        // コメント欄に対応するエラーは入力欄に、それ以外はフォーム全体に表示する（無言で失敗させない）
        const unmatched: string[] = []
        for (const { field, message } of error.error.details) {
          if (field === 'comment') form.setError('comment', { message })
          else unmatched.push(message)
        }
        if (unmatched.length) setFormError(unmatched.join(' / '))
        return
      }

      setFormError(error?.error.message ?? GENERIC_ERROR)
    } catch {
      setFormError(GENERIC_ERROR)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <Form {...form}>
      {/* ブラウザ標準の検証メッセージではなく、画面定義書のメッセージを表示する */}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
        <FormError message={formError} />
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>コメントを追加</FormLabel>
              <FormControl>
                {/* 投稿中に打った内容が、成功時のクリアで消えないよう編集不可にする */}
                <Textarea rows={3} readOnly={isSubmitting} {...field} />
              </FormControl>
              <p
                className={cn(
                  'text-muted-foreground text-right text-xs',
                  count > COMMENT_MAX_LENGTH && 'text-destructive',
                )}
              >
                {count}/{COMMENT_MAX_LENGTH}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? '投稿中…' : '投稿'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
