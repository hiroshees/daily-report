import { ReportCreateRequestSchema, ReportListQuerySchema } from '@/schemas/report'
import { defineRoute } from '@/server/http'
import { createReport } from '@/server/services/report'
import { listReports } from '@/server/services/report-list'

// 閲覧はログインユーザー全員（既定の認証 = requireAuth）。担当者での絞り込みは管理者のみ有効（サービス層で判定）
export const GET = defineRoute({
  query: ReportListQuerySchema,
  handler: ({ query, user }) => listReports(query, user),
})

// 作成者はログインユーザー本人（sales_person_id はリクエストから受け取らない）。管理者も自分の日報は作成可
export const POST = defineRoute({
  body: ReportCreateRequestSchema,
  status: 201,
  handler: ({ user, body }) => createReport(user.id, body),
})
