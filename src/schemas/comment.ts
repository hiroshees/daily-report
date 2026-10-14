import { dateTimeField, idField, requiredString } from '@/schemas/fields'
import { z } from '@/schemas/zod'

export const COMMENT_MAX_LENGTH = 500

export const CommentSchema = z
  .object({
    id: idField,
    manager: z.object({ id: idField, name: z.string().openapi({ example: '田中部長' }) }),
    comment: z.string().openapi({ example: '新規開拓については明日相談しましょう。' }),
    created_at: dateTimeField,
  })
  .openapi('Comment')

export const CommentCreateRequestSchema = z
  .object({ comment: requiredString('コメント', COMMENT_MAX_LENGTH) })
  .openapi('CommentCreateRequest')

export const CommentCreateResponseSchema = z
  .object({
    id: idField,
    report_id: idField,
    manager_id: idField,
    comment: z.string(),
    created_at: dateTimeField,
  })
  .openapi('CommentCreateResponse')

export type CommentCreateRequest = z.infer<typeof CommentCreateRequestSchema>
