'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormError } from '@/components/common/form-error'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api-client'
import {
  CustomerFormSchema,
  EMPTY_CUSTOMER,
  toCustomerRequest,
  type CustomerFormValues,
} from '@/schemas/customer-form'

const GENERIC_ERROR = '顧客の保存に失敗しました。時間をおいてもう一度お試しください。'

const FIELDS = ['company_name', 'contact_person', 'phone', 'email', 'address'] as const
const isField = (value: string): value is (typeof FIELDS)[number] =>
  (FIELDS as readonly string[]).includes(value)

type CustomerFormProps = {
  /** 編集する顧客の ID。未指定なら新規登録 */
  customerId?: number
  initialValues?: CustomerFormValues
  onSaved: () => void
  onCancel: () => void
}

/** 顧客の登録・編集フォーム（ダイアログの中身）。会社名のみ必須 */
export function CustomerForm({ customerId, initialValues, onSaved, onCancel }: CustomerFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema),
    // 入力のたびに検証し、不正な間は保存ボタンを押せないようにする
    mode: 'onChange',
    defaultValues: initialValues ?? EMPTY_CUSTOMER,
  })
  const { isSubmitting, isValid } = form.formState

  async function onSubmit(values: CustomerFormValues) {
    // 二重送信の防止（state は再描画まで反映されないため ref で判定する）
    if (submittingRef.current) return
    submittingRef.current = true
    setFormError(null)
    try {
      const body = toCustomerRequest(values)
      const { response, error } =
        customerId === undefined
          ? await apiClient.POST('/customers', { body })
          : await apiClient.PUT('/customers/{id}', { params: { path: { id: customerId } }, body })

      if (response.ok) {
        // 保存に成功したら、ダイアログを閉じて一覧を再取得するのは呼び出し側
        onSaved()
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        // 項目に対応するエラーは入力欄に、対応できないものはフォーム全体に表示する
        const unmatched: string[] = []
        for (const { field, message } of error.error.details) {
          if (isField(field)) form.setError(field, { message })
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
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>会社名（必須）</FormLabel>
              <FormControl>
                <Input autoFocus autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当者名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>電話番号</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>住所</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
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
