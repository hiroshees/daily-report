import { z } from '@/schemas/zod'

/** エラーコード（doc/API_SCHEME.md 4章） */
export const ERROR_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'DUPLICATE_REPORT',
  'DUPLICATE_EMAIL',
  'RESOURCE_IN_USE',
  'EDIT_PERIOD_EXPIRED',
  'NOT_FOUND',
  'INTERNAL_ERROR',
] as const

export const ErrorCodeSchema = z.enum(ERROR_CODES).openapi('ErrorCode')

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: ErrorCodeSchema,
      message: z.string().openapi({ example: '入力値が不正です' }),
      details: z
        .array(
          z.object({
            field: z.string().openapi({ example: 'problem' }),
            message: z.string().openapi({ example: '課題・相談は必須項目です' }),
          }),
        )
        .optional(),
    }),
  })
  .openapi('ErrorResponse')

export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 100

/** ページネーションのクエリ（page 既定 1、per_page 既定 20・上限 100） */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ description: 'ページ番号' }),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE)
    .openapi({ description: '1ページあたりの件数' }),
})

export const PaginationSchema = z
  .object({
    total: z.number().int().min(0).openapi({ example: 100 }),
    page: z.number().int().min(1).openapi({ example: 1 }),
    per_page: z.number().int().min(1).openapi({ example: 20 }),
    total_pages: z.number().int().min(0).openapi({ example: 5 }),
  })
  .openapi('Pagination')

/** パスの {id}（正の整数） */
export const IdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
})

/** 一覧レスポンス `{ data, pagination }` を作る */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: PaginationSchema })

/** 一覧レスポンス `{ data }`（ページネーションなし）を作る */
export const listOf = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item) })
