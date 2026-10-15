import { CommentCreateRequestSchema } from '@/schemas/comment'
import { IdParamSchema } from '@/schemas/common'
import { defineRoute } from '@/server/http'
import { createComment, listComments } from '@/server/services/comment'

// 閲覧は日報詳細と同じ（ログインユーザー全員）
export const GET = defineRoute({
  params: IdParamSchema,
  handler: ({ params }) => listComments(params.id),
})

// 追加は管理者のみ。manager_id はログインユーザーから設定する
export const POST = defineRoute({
  auth: 'manager',
  params: IdParamSchema,
  body: CommentCreateRequestSchema,
  status: 201,
  handler: ({ user, params, body }) => createComment(params.id, user.id, body),
})
