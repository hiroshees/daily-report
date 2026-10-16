import { messages, requiredString, TIME_PATTERN } from '@/schemas/fields'
import {
  PLAN_MAX_LENGTH,
  PROBLEM_MAX_LENGTH,
  VISIT_CONTENT_MAX_LENGTH,
  type ReportCreateRequest,
  type ReportUpdateRequest,
} from '@/schemas/report'
import { z } from '@/schemas/zod'

/**
 * 日報フォーム（作成・編集画面）の入力値の検証。
 * 文言・文字数の上限は API のスキーマ（report.ts）と同じ定義を使う。
 * フォームでは未選択・未入力を表現する必要があるため、顧客は undefined、訪問時刻は空文字を許可する。
 */
const visitFields = {
  customer_id: z
    .number({ error: messages.required('顧客名') })
    .int()
    .positive({ error: messages.required('顧客名') }),
  visit_time: z.string().refine((value) => value === '' || TIME_PATTERN.test(value), {
    error: messages.invalidFormat('訪問時刻'),
  }),
  visit_content: requiredString('訪問内容', VISIT_CONTENT_MAX_LENGTH),
}

/** 編集では、既存の訪問記録の ID（API の `id`）を保持する。react-hook-form が `id` を予約するため別名にしている */
const EditVisitFormSchema = z.object({
  visit_id: z.number().int().positive().optional(),
  ...visitFields,
})

const reportFields = {
  problem: requiredString('課題・相談', PROBLEM_MAX_LENGTH),
  plan: requiredString('明日の計画', PLAN_MAX_LENGTH),
}

/** 作成画面用。訪問記録の最小件数は未確定（#27）のため、0 件でも保存できる */
export const ReportFormSchema = z.object({
  visits: z.array(z.object(visitFields)),
  ...reportFields,
})

/** 編集画面用。訪問記録に visit_id を持てる */
export const EditReportFormSchema = z.object({
  visits: z.array(EditVisitFormSchema),
  ...reportFields,
})

/** フォームの検証後の値。作成は visit_id を持たないため、編集用の型（上位互換）で表す */
export type ReportFormSchemaOutput = z.infer<typeof EditReportFormSchema>

/** 入力途中の値（顧客が未選択の行を含む） */
export type ReportFormValues = {
  visits: {
    visit_id?: number
    // 未選択は null。undefined だと react-hook-form が defaultValues（編集時は既存の顧客）で埋めてしまう
    customer_id: number | null
    visit_time: string
    visit_content: string
  }[]
  problem: string
  plan: string
}

export const EMPTY_VISIT: ReportFormValues['visits'][number] = {
  customer_id: null,
  visit_time: '',
  visit_content: '',
}

/** フォームの値を更新 API のリクエストに変換する。既存の訪問記録は id を付け、id のないものは新規になる */
export function toUpdateRequest(values: ReportFormSchemaOutput): ReportUpdateRequest {
  return {
    problem: values.problem,
    plan: values.plan,
    visits: values.visits.map((visit) => ({
      ...(visit.visit_id === undefined ? {} : { id: visit.visit_id }),
      customer_id: visit.customer_id,
      visit_time: visit.visit_time === '' ? null : visit.visit_time,
      visit_content: visit.visit_content,
    })),
  }
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
