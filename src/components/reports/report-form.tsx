'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/common/form-error'
import { CustomerCombobox } from '@/components/reports/customer-combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatFullDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { countChars } from '@/schemas/fields'
import { PLAN_MAX_LENGTH, PROBLEM_MAX_LENGTH, VISIT_CONTENT_MAX_LENGTH } from '@/schemas/report'
import {
  EMPTY_VISIT,
  ReportFormSchema,
  toCreateRequest,
  type ReportFormSchemaOutput,
  type ReportFormValues,
} from '@/schemas/report-form'

const GENERIC_ERROR = '日報の保存に失敗しました。時間をおいてもう一度お試しください。'
const LEAVE_CONFIRM = '入力中の内容は保存されていません。破棄して移動しますか？'

type ReportFormProps = {
  /** 日報の日付（YYYY-MM-DD）。本日固定で、変更できない */
  reportDate: string
  /** 作成者（ログインユーザー）の氏名 */
  authorName: string
}

/** 文字数カウンタ（現在/上限）。上限を超えたら赤字にする */
function CharCounter({ value, max }: { value: string; max: number }) {
  const count = countChars(value)
  return (
    <p
      className={cn('text-muted-foreground text-right text-xs', count > max && 'text-destructive')}
      aria-live="off"
    >
      {count}/{max}
    </p>
  )
}

/** 日報作成フォーム（SC003）。訪問記録は動的に追加・削除できる */
export function ReportForm({ reportDate, authorName }: ReportFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  // 保存成功後は、画面遷移が終わるまで離脱確認とボタン操作を止める
  const [saved, setSaved] = useState(false)

  const form = useForm<ReportFormValues, unknown, ReportFormSchemaOutput>({
    // 入力途中は顧客が未選択（undefined）になりうるため、入力型を ReportFormValues に広げる
    resolver: zodResolver(ReportFormSchema) as Resolver<
      ReportFormValues,
      unknown,
      ReportFormSchemaOutput
    >,
    // 入力のたびに検証し、不正な間は保存ボタンを押せないようにする（TC-REPORT-004）
    mode: 'onChange',
    defaultValues: { visits: [], problem: '', plan: '' },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'visits' })
  const { isSubmitting, isValid, isDirty } = form.formState
  const visits = useWatch({ control: form.control, name: 'visits' })

  // 未保存のまま離脱（リロード・タブを閉じる）する場合はブラウザの確認を出す
  useEffect(() => {
    if (!isDirty || saved) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, saved])

  async function onSubmit(values: ReportFormSchemaOutput) {
    // 二重送信の防止（ボタンの非活性化に加え、Enter キーなどでの再送信も止める）
    if (isSubmitting || saved) return
    setFormError(null)
    try {
      const { response, error } = await apiClient.POST('/reports', {
        body: toCreateRequest(values, reportDate),
      })

      if (response.ok) {
        setSaved(true)
        toast.success('日報を保存しました')
        router.push('/reports')
        router.refresh()
        return
      }

      if (response.status === 409 && error?.error.code === 'DUPLICATE_REPORT') {
        setFormError('同じ日付の日報が既に存在します')
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        for (const { field, message } of error.error.details) {
          if (field === 'problem' || field === 'plan') form.setError(field, { message })
        }
        setFormError(error.error.message)
        return
      }

      setFormError(error?.error.message ?? GENERIC_ERROR)
    } catch {
      setFormError(GENERIC_ERROR)
    }
  }

  function cancel() {
    if (isDirty && !saved && !window.confirm(LEAVE_CONFIRM)) return
    router.push('/reports')
  }

  const busy = isSubmitting || saved

  return (
    <Form {...form}>
      {/* ブラウザ標準の検証メッセージではなく、画面定義書のメッセージを表示する */}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardContent className="grid gap-1 pt-6 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">日付：</span>
              {formatFullDate(reportDate)}
            </p>
            <p>
              <span className="text-muted-foreground">作成者：</span>
              {authorName}
            </p>
          </CardContent>
        </Card>

        <FormError message={formError} />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">訪問記録</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...EMPTY_VISIT })}
            >
              <Plus aria-hidden />
              訪問記録を追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <p className="text-muted-foreground text-sm">訪問記録はまだありません</p>
            )}

            {fields.map((field, index) => (
              <fieldset
                key={field.id}
                className="space-y-4 rounded-md border p-4"
                aria-label={`訪問記録 ${index + 1}`}
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                  <FormField
                    control={form.control}
                    name={`visits.${index}.customer_id`}
                    render={({ field: customerField, fieldState }) => (
                      <FormItem>
                        <FormLabel>顧客名</FormLabel>
                        <FormControl>
                          <CustomerCombobox
                            value={customerField.value}
                            onChange={(customerId) => {
                              customerField.onChange(customerId)
                              customerField.onBlur()
                            }}
                            invalid={Boolean(fieldState.error)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`visits.${index}.visit_time`}
                    render={({ field: timeField }) => (
                      <FormItem>
                        <FormLabel>訪問時刻（任意）</FormLabel>
                        <FormControl>
                          <Input type="time" {...timeField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`visits.${index}.visit_content`}
                  render={({ field: contentField }) => (
                    <FormItem>
                      <FormLabel>訪問内容</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...contentField} />
                      </FormControl>
                      <CharCounter
                        value={visits?.[index]?.visit_content ?? ''}
                        max={VISIT_CONTENT_MAX_LENGTH}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label={`訪問記録 ${index + 1} を削除`}
                  >
                    <Trash2 aria-hidden />
                    削除
                  </Button>
                </div>
              </fieldset>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">本日の課題・相談（Problem）</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="problem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">課題・相談</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <CharCounter value={field.value} max={PROBLEM_MAX_LENGTH} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">明日の計画（Plan）</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">明日の計画</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <CharCounter value={field.value} max={PLAN_MAX_LENGTH} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            キャンセル
          </Button>
          <Button type="submit" disabled={!isValid || busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
