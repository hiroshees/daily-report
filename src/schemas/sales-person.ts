import { dateTimeField, emailField, idField, passwordField, requiredString } from '@/schemas/fields'
import { z } from '@/schemas/zod'

// 文字数の上限（営業担当者フォームの検証と共有する）
export const NAME_MAX_LENGTH = 100
export const DEPARTMENT_MAX_LENGTH = 100

// 一覧にはページネーションがない（API_SCHEME 3.4）
// 文字数の上限は DB（prisma/schema.prisma）の VarChar に合わせる
export const SalesPersonListQuerySchema = z.object({
  department: z.string().optional().openapi({ description: '部署名で絞り込み' }),
  is_manager: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: '管理者フラグで絞り込み（true / false）' }),
})

export const SalesPersonSchema = z
  .object({
    id: idField,
    name: z.string().openapi({ example: '山田太郎' }),
    email: z.string().openapi({ example: 'yamada@example.com' }),
    department: z.string().openapi({ example: '営業1課' }),
    is_manager: z.boolean(),
  })
  .openapi('SalesPerson')

export const SalesPersonDetailSchema = SalesPersonSchema.extend({
  created_at: dateTimeField,
  updated_at: dateTimeField,
}).openapi('SalesPersonDetail')

export const SalesPersonCreateRequestSchema = z
  .object({
    name: requiredString('氏名', NAME_MAX_LENGTH),
    email: emailField(),
    password: passwordField(),
    department: requiredString('部署', DEPARTMENT_MAX_LENGTH),
    is_manager: z.boolean().default(false),
  })
  .openapi('SalesPersonCreateRequest')

export const SalesPersonCreateResponseSchema = SalesPersonSchema.extend({
  created_at: dateTimeField,
}).openapi('SalesPersonCreateResponse')

export const SalesPersonUpdateRequestSchema = z
  .object({
    name: requiredString('氏名', NAME_MAX_LENGTH),
    email: emailField(),
    department: requiredString('部署', DEPARTMENT_MAX_LENGTH),
    is_manager: z.boolean(),
  })
  .openapi('SalesPersonUpdateRequest')

export const SalesPersonUpdateResponseSchema = SalesPersonSchema.extend({
  updated_at: dateTimeField,
}).openapi('SalesPersonUpdateResponse')

export type SalesPersonCreateRequest = z.infer<typeof SalesPersonCreateRequestSchema>
export type SalesPersonUpdateRequest = z.infer<typeof SalesPersonUpdateRequestSchema>
export type SalesPersonListQuery = z.infer<typeof SalesPersonListQuerySchema>
