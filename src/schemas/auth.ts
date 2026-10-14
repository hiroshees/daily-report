import { dateTimeField, emailField, idField, passwordField, requiredString } from '@/schemas/fields'
import { z } from '@/schemas/zod'

/** ログインユーザー（`/auth/login` の user、`/auth/me` のレスポンス） */
export const CurrentUserSchema = z
  .object({
    id: idField,
    name: z.string().openapi({ example: '山田太郎' }),
    email: z.string().openapi({ example: 'yamada@example.com' }),
    department: z.string().openapi({ example: '営業1課' }),
    is_manager: z.boolean(),
  })
  .openapi('CurrentUser')

export const LoginRequestSchema = z
  .object({
    email: emailField(),
    password: passwordField(),
  })
  .openapi('LoginRequest')

export const LoginResponseSchema = z
  .object({
    token: requiredString('トークン').openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
    expires_at: dateTimeField,
    user: CurrentUserSchema,
  })
  .openapi('LoginResponse')

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type CurrentUser = z.infer<typeof CurrentUserSchema>
