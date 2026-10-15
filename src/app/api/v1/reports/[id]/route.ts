import { IdParamSchema } from '@/schemas/common'
import { ReportUpdateRequestSchema } from '@/schemas/report'
import { defineRoute } from '@/server/http'
import { deleteReport, getReport, updateReport } from '@/server/services/report'

// 閲覧はログインユーザー全員（全員分の日報が対象）
export const GET = defineRoute({
  params: IdParamSchema,
  handler: ({ params }) => getReport(params.id),
})

// 編集・削除は日報の作成者本人のみ（管理者も他人の日報は不可。判定はサービス層）
export const PUT = defineRoute({
  params: IdParamSchema,
  body: ReportUpdateRequestSchema,
  handler: ({ params, body, user }) => updateReport(params.id, user.id, body),
})

export const DELETE = defineRoute({
  params: IdParamSchema,
  status: 204,
  handler: ({ params, user }) => deleteReport(params.id, user.id),
})
