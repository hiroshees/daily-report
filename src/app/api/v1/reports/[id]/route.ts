import { IdParamSchema } from '@/schemas/common'
import { defineRoute } from '@/server/http'
import { getReport } from '@/server/services/report'

// 閲覧はログインユーザー全員（全員分の日報が対象）
export const GET = defineRoute({
  params: IdParamSchema,
  handler: ({ params }) => getReport(params.id),
})
