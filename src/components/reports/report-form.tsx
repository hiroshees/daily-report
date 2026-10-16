'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldPath, type Resolver } from 'react-hook-form'
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
import { formatFullDate, todayInJst } from '@/lib/date'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'
import { cn } from '@/lib/utils'
import { countChars } from '@/schemas/fields'
import { PLAN_MAX_LENGTH, PROBLEM_MAX_LENGTH, VISIT_CONTENT_MAX_LENGTH } from '@/schemas/report'
import {
  EMPTY_VISIT,
  EditReportFormSchema,
  ReportFormSchema,
  toCreateRequest,
  toUpdateRequest,
  type ReportFormSchemaOutput,
  type ReportFormValues,
} from '@/schemas/report-form'

const GENERIC_ERROR = '日報の保存に失敗しました。時間をおいてもう一度お試しください。'
/** 再送信しても成功しない API エラー */
const UNRECOVERABLE_CODES: readonly string[] = ['EDIT_PERIOD_EXPIRED', 'FORBIDDEN', 'NOT_FOUND']
const LEAVE_CONFIRM = '入力中の内容は保存されていません。破棄して移動しますか？'

type ReportFormProps = {
  /** 日報の日付（YYYY-MM-DD）。作成では本日固定、編集では既存の日付。どちらも変更できない */
  reportDate: string
  /** 作成者（ログインユーザー）の氏名 */
  authorName: string
} & (
  | { mode: 'create' }
  | {
      mode: 'edit'
      reportId: number
      /** 保存後・キャンセル後に戻る日報詳細の URL（一覧の検索条件を引き継ぐ） */
      detailHref: string
      /** 既存の日報の内容（訪問記録は visit_id を保持し、差分更新に使う） */
      initialValues: ReportFormValues
      /** 既存の訪問記録の顧客名（顧客 ID → 会社名） */
      customerLabels: Record<number, string>
    }
)

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

/** 日報フォーム。作成（SC003）と編集（SC004）で共通。訪問記録は動的に追加・削除できる */
export function ReportForm(props: ReportFormProps) {
  const { authorName } = props
  const router = useRouter()
  // 作成のみ：日付をまたいで開きっぱなしにした場合に、送信時に最新の「本日」へ更新する。
  // 編集の日付は既存のまま変わらない
  const [createDate, setCreateDate] = useState(props.reportDate)
  const reportDate = props.mode === 'edit' ? props.reportDate : createDate
  // 保存後・キャンセル後の戻り先（作成は一覧、編集は日報詳細）
  const backHref = props.mode === 'edit' ? props.detailHref : '/reports'
  const backLabel = props.mode === 'edit' ? '日報詳細' : '一覧'
  const [formError, setFormError] = useState<string | null>(null)
  // 保存成功後は、画面遷移が終わるまで離脱確認とボタン操作を止める
  const [saved, setSaved] = useState(false)
  // 編集期限切れなど、再送信しても保存できない状態
  const [locked, setLocked] = useState(false)
  const submittingRef = useRef(false)

  const form = useForm<ReportFormValues, unknown, ReportFormSchemaOutput>({
    // 入力途中は顧客が未選択（null）になりうるため、入力型を ReportFormValues に広げる
    resolver: zodResolver(
      props.mode === 'edit' ? EditReportFormSchema : ReportFormSchema,
    ) as Resolver<ReportFormValues, unknown, ReportFormSchemaOutput>,
    // 入力のたびに検証し、不正な間は保存ボタンを押せないようにする（TC-REPORT-004）
    mode: 'onChange',
    defaultValues:
      props.mode === 'edit' ? props.initialValues : { visits: [], problem: '', plan: '' },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'visits' })
  const { isSubmitting, isValid, isDirty } = form.formState
  const visits = useWatch({ control: form.control, name: 'visits' })

  // 未保存のまま離脱する場合は確認する（保存成功後は遷移を妨げない）
  useUnsavedChangesGuard(isDirty && !saved, LEAVE_CONFIRM)

  function updateReport(reportId: number, values: ReportFormSchemaOutput) {
    return apiClient.PUT('/reports/{id}', {
      params: { path: { id: reportId } },
      body: toUpdateRequest(values),
    })
  }

  function createReport(values: ReportFormSchemaOutput) {
    // 画面を開いたまま日付が変わった場合は、本日付の日報として保存する（画面の日付も更新する）
    const today = todayInJst()
    if (today !== createDate) {
      setCreateDate(today)
      toast.info(`日付が変わったため、${formatFullDate(today)} の日報として保存します`)
    }
    return apiClient.POST('/reports', { body: toCreateRequest(values, today) })
  }

  async function onSubmit(values: ReportFormSchemaOutput) {
    // 二重送信の防止。state は再描画まで反映されないため、同期的に更新できる ref で判定する。
    // 失敗時は解除して再送信できるようにし、成功時は遷移が終わるまで立てたままにする
    if (submittingRef.current) return
    submittingRef.current = true
    setFormError(null)

    try {
      const { response, error } =
        props.mode === 'edit'
          ? await updateReport(props.reportId, values)
          : await createReport(values)

      if (response.ok) {
        setSaved(true)
        toast.success('日報を保存しました')
        // 遷移に失敗しても操作不能にならないよう、下の移動リンクを案内する
        router.push(backHref)
        router.refresh()
        return
      }

      // 再送信しても成功しないエラー（期限切れ・権限なし・削除済み）は、保存できないようにする
      if (error && UNRECOVERABLE_CODES.includes(error.error.code)) {
        setLocked(true)
        setFormError(error.error.message)
        return
      }
      submittingRef.current = false

      if (response.status === 409 && error?.error.code === 'DUPLICATE_REPORT') {
        setFormError('同じ日付の日報が既に存在します')
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        // 項目に対応するエラーは該当の入力欄に、対応できないものはフォーム全体に表示する
        const unmatched: string[] = []
        for (const { field, message } of error.error.details) {
          if (isFormField(field)) form.setError(field, { message })
          else unmatched.push(message)
        }
        setFormError(unmatched.length ? unmatched.join(' / ') : error.error.message)
        return
      }

      setFormError(error?.error.message ?? GENERIC_ERROR)
    } catch {
      submittingRef.current = false
      setFormError(GENERIC_ERROR)
    }
  }

  function cancel() {
    if (isDirty && !saved && !window.confirm(LEAVE_CONFIRM)) return
    router.push(backHref)
  }

  const busy = isSubmitting || saved

  /** API のエラー位置（`visits.0.visit_content` 形式）が、フォームの入力欄に対応するか */
  function isFormField(field: string): field is FieldPath<ReportFormValues> {
    if (field === 'problem' || field === 'plan') return true
    const match = /^visits\.(\d+)\.(customer_id|visit_time|visit_content)$/.exec(field)
    return match !== null && Number(match[1]) < fields.length
  }

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
                    render={({ field: customerField }) => (
                      <FormItem>
                        <FormLabel>顧客名</FormLabel>
                        <FormControl>
                          <CustomerCombobox
                            value={customerField.value ?? undefined}
                            selectedLabel={
                              props.mode === 'edit' && customerField.value !== null
                                ? props.customerLabels[customerField.value]
                                : undefined
                            }
                            onChange={(customerId) => {
                              customerField.onChange(customerId)
                              customerField.onBlur()
                            }}
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

        {saved && (
          <p role="status" className="text-muted-foreground text-right text-sm">
            保存しました。{backLabel}へ移動しています…{' '}
            <Link href={backHref} className="text-foreground underline">
              移動しない場合はこちら
            </Link>
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            キャンセル
          </Button>
          <Button type="submit" disabled={!isValid || busy || locked}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
