import { PaginationQuerySchema } from '@/schemas/common'
import { CommentSchema } from '@/schemas/comment'
import {
  dateField,
  dateTimeField,
  idField,
  optionalTimeField,
  requiredString,
} from '@/schemas/fields'
import { z } from '@/schemas/zod'

// 文字数の上限（doc/SCREEN_DESIGN.md 5章）
export const VISIT_CONTENT_MAX_LENGTH = 500
export const PROBLEM_MAX_LENGTH = 1000
export const PLAN_MAX_LENGTH = 1000

const START_DATE_LABEL = '開始日'
const END_DATE_LABEL = '終了日'

export const ReportListQuerySchema = PaginationQuerySchema.extend({
  start_date: dateField(START_DATE_LABEL).optional().openapi({ description: '開始日（含む）' }),
  end_date: dateField(END_DATE_LABEL).optional().openapi({ description: '終了日（含む）' }),
  sales_person_id: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .openapi({ description: '営業担当者ID（管理者のみ有効）' }),
}).refine((query) => !query.start_date || !query.end_date || query.start_date <= query.end_date, {
  path: ['end_date'],
  error: `${END_DATE_LABEL}は${START_DATE_LABEL}以降の日付を指定してください`,
})

export const ReportListItemSchema = z
  .object({
    id: idField,
    report_date: dateField('日報日付'),
    sales_person: z.object({ id: idField, name: z.string().openapi({ example: '山田太郎' }) }),
    visit_count: z.number().int().min(0).openapi({ example: 3 }),
    has_comments: z.boolean(),
    created_at: dateTimeField,
  })
  .openapi('ReportListItem')

/** 訪問記録の入力。更新時は既存の訪問記録に id を付ける（id なしは新規） */
const visitInput = {
  customer_id: idField.openapi({ description: '顧客ID' }),
  visit_time: optionalTimeField('訪問時刻'),
  visit_content: requiredString('訪問内容', VISIT_CONTENT_MAX_LENGTH),
}

export const VisitCreateInputSchema = z.object(visitInput).openapi('VisitCreateInput')
export const VisitUpdateInputSchema = z
  .object({
    id: idField.optional().openapi({ description: '既存の訪問記録ID（新規は省略）' }),
    ...visitInput,
  })
  .openapi('VisitUpdateInput')

export const VisitSchema = z
  .object({
    id: idField,
    customer: z.object({ id: idField, company_name: z.string().openapi({ example: 'ABC商事' }) }),
    visit_time: z.string().nullable().openapi({ example: '10:00' }),
    visit_content: z.string().openapi({ example: '新商品の提案を実施...' }),
  })
  .openapi('Visit')

export const ReportDetailSchema = z
  .object({
    id: idField,
    report_date: dateField('日報日付'),
    sales_person: z.object({
      id: idField,
      name: z.string().openapi({ example: '山田太郎' }),
      email: z.string().openapi({ example: 'yamada@example.com' }),
    }),
    problem: z.string(),
    plan: z.string(),
    visits: z.array(VisitSchema),
    comments: z.array(CommentSchema),
    created_at: dateTimeField,
    updated_at: dateTimeField,
  })
  .openapi('ReportDetail')

export const ReportCreateRequestSchema = z
  .object({
    report_date: dateField('日報日付'),
    problem: requiredString('課題・相談', PROBLEM_MAX_LENGTH),
    plan: requiredString('明日の計画', PLAN_MAX_LENGTH),
    // 訪問記録の最小件数は未確定（#27）。現状は 0 件も許可する
    visits: z.array(VisitCreateInputSchema),
  })
  .openapi('ReportCreateRequest')

export const ReportCreateResponseSchema = z
  .object({
    id: idField,
    report_date: dateField('日報日付'),
    sales_person_id: idField,
    problem: z.string(),
    plan: z.string(),
    created_at: dateTimeField,
  })
  .openapi('ReportCreateResponse')

/** 更新では日報の日付と作成者は変更できない */
export const ReportUpdateRequestSchema = z
  .object({
    problem: requiredString('課題・相談', PROBLEM_MAX_LENGTH),
    plan: requiredString('明日の計画', PLAN_MAX_LENGTH),
    visits: z.array(VisitUpdateInputSchema),
  })
  .openapi('ReportUpdateRequest')

export const ReportUpdateResponseSchema = ReportCreateResponseSchema.omit({ created_at: true })
  .extend({ updated_at: dateTimeField })
  .openapi('ReportUpdateResponse')

export type ReportCreateRequest = z.infer<typeof ReportCreateRequestSchema>
export type ReportUpdateRequest = z.infer<typeof ReportUpdateRequestSchema>
export type ReportListQuery = z.infer<typeof ReportListQuerySchema>
