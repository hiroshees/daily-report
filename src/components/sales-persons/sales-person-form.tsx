'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { FormError } from '@/components/common/form-error'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import {
  EMPTY_SALES_PERSON,
  SalesPersonCreateFormSchema,
  SalesPersonEditFormSchema,
  toCreateRequest,
  toUpdateRequest,
  type SalesPersonFormValues,
} from '@/schemas/sales-person-form'

const GENERIC_ERROR = '営業担当者の保存に失敗しました。時間をおいてもう一度お試しください。'

const FIELDS = ['name', 'email', 'password', 'department', 'is_manager'] as const
const isField = (value: string): value is (typeof FIELDS)[number] =>
  (FIELDS as readonly string[]).includes(value)

type SalesPersonFormProps = {
  /** 編集する担当者。未指定なら新規登録 */
  person?: { id: number; name: string; email: string; department: string; is_manager: boolean }
  /** ログインユーザー本人か。本人は自分の権限を降格できない（API でも拒否される） */
  isSelf?: boolean
  onSaved: () => void
  onCancel: () => void
  /** 保存の通信中かどうかの通知。ダイアログが、通信中に閉じられないようにするために使う */
  onSubmittingChange?: (submitting: boolean) => void
  /** 編集中に、対象が別の管理者に削除されていた場合 */
  onNotFound: () => void
}

/** 営業担当者の登録・編集フォーム（ダイアログの中身）。パスワードは登録時のみ入力する */
export function SalesPersonForm({
  person,
  isSelf,
  onSaved,
  onCancel,
  onSubmittingChange,
  onNotFound,
}: SalesPersonFormProps) {
  const isEdit = person !== undefined
  const [formError, setFormError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const form = useForm<SalesPersonFormValues>({
    resolver: zodResolver(
      isEdit ? SalesPersonEditFormSchema : SalesPersonCreateFormSchema,
    ) as Resolver<SalesPersonFormValues>,
    // 入力のたびに検証し、不正な間は保存ボタンを押せないようにする
    mode: 'onChange',
    defaultValues: person
      ? {
          name: person.name,
          email: person.email,
          password: '',
          department: person.department,
          is_manager: person.is_manager,
        }
      : EMPTY_SALES_PERSON,
  })
  const { isSubmitting, isValid } = form.formState

  useEffect(() => {
    onSubmittingChange?.(isSubmitting)
  }, [isSubmitting, onSubmittingChange])

  async function onSubmit(values: SalesPersonFormValues) {
    // 二重送信の防止（state は再描画まで反映されないため ref で判定する）
    if (submittingRef.current) return
    submittingRef.current = true
    setFormError(null)
    try {
      const { response, error } = person
        ? await apiClient.PUT('/sales-persons/{id}', {
            params: { path: { id: person.id } },
            body: toUpdateRequest(values),
          })
        : await apiClient.POST('/sales-persons', { body: toCreateRequest(values) })

      if (response.ok) {
        onSaved()
        return
      }

      if (response.status === 404) {
        onNotFound()
        return
      }

      // メールアドレスの重複(409)は、メールアドレスの入力欄に表示する
      if (response.status === 409 && error?.error.code === 'DUPLICATE_EMAIL') {
        form.setError('email', { message: error.error.message })
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        // 項目に対応するエラーは入力欄に、対応できないものはフォーム全体に表示する
        const unmatched: string[] = []
        for (const { field, message } of error.error.details) {
          // 編集ではパスワード欄がなく、表示先がないため、フォーム全体に表示する
          if (isField(field) && !(isEdit && field === 'password')) form.setError(field, { message })
          else unmatched.push(message)
        }
        if (unmatched.length) setFormError(unmatched.join(' / '))
        return
      }

      // 最後の管理者の降格など（409 RESOURCE_IN_USE）はメッセージをそのまま表示する
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
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>氏名</FormLabel>
              <FormControl>
                <Input autoFocus autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 編集 API はパスワードを受け取らないため、登録時のみ表示する */}
        {!isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>8文字以上で入力してください</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>部署</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_manager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>権限</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(value) => field.onChange(value === 'true')}
                // 自分自身の降格は、UI でも防ぐ（API でも拒否される）
                disabled={isSelf}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="false">一般</SelectItem>
                  <SelectItem value="true">管理者</SelectItem>
                </SelectContent>
              </Select>
              {isSelf && <FormDescription>自分自身の権限は変更できません</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
