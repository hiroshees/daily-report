import { messages, requiredString, TIME_PATTERN } from '@/schemas/fields'
import {
  PLAN_MAX_LENGTH,
  PROBLEM_MAX_LENGTH,
  VISIT_CONTENT_MAX_LENGTH,
  type ReportCreateRequest,
} from '@/schemas/report'
import { z } from '@/schemas/zod'

/**
 * 日報フォーム（作成・編集画面）の入力値の検証。
 * 文言・文字数の上限は API のスキーマ（report.ts）と同じ定義を使う。
 * フォームでは未選択・未入力を表現する必要があるため、顧客は undefined、訪問時刻は空文字を許可する。
 */
export const VisitFormSchema = z.object({
  customer_id: z
    .number({ error: messages.required('顧客名') })
    .int()
    .positive({ error: messages.required('顧客名') }),
  visit_time: z.string().refine((value) => value === '' || TIME_PATTERN.test(value), {
    error: messages.invalidFormat('訪問時刻'),
  }),
  visit_content: requiredString('訪問内容', VISIT_CONTENT_MAX_LENGTH),
})

export const ReportFormSchema = z.object({
  // 訪問記録の最小件数は未確定（#27）のため、0 件でも保存できる
  visits: z.array(VisitFormSchema),
  problem: requiredString('課題・相談', PROBLEM_MAX_LENGTH),
  plan: requiredString('明日の計画', PLAN_MAX_LENGTH),
})

export type ReportFormSchemaOutput = z.infer<typeof ReportFormSchema>

/** 入力途中の値（顧客が未選択の行を含む） */
export type ReportFormValues = {
  visits: { customer_id: number | undefined; visit_time: string; visit_content: string }[]
  problem: string
  plan: string
}

export const EMPTY_VISIT: ReportFormValues['visits'][number] = {
  customer_id: undefined,
  visit_time: '',
  visit_content: '',
}

/** フォームの値を作成 API のリクエストに変換する。訪問時刻の空文字は未指定（null）にする */
export function toCreateRequest(
  values: ReportFormSchemaOutput,
  reportDate: string,
): ReportCreateRequest {
  return {
    report_date: reportDate,
    problem: values.problem,
    plan: values.plan,
    visits: values.visits.map((visit) => ({
      customer_id: visit.customer_id,
      visit_time: visit.visit_time === '' ? null : visit.visit_time,
      visit_content: visit.visit_content,
    })),
  }
}
