import { ReportListQuerySchema } from '@/schemas/report'
import { defineRoute } from '@/server/http'
import { listReports } from '@/server/services/report-list'

// 閲覧はログインユーザー全員（既定の認証 = requireAuth）。担当者での絞り込みは管理者のみ有効（サービス層で判定）
export const GET = defineRoute({
  query: ReportListQuerySchema,
  handler: ({ query, user }) => listReports(query, user),
})
