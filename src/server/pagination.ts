import type { z } from '@/schemas/zod'
import type { PaginationQuerySchema, PaginationSchema } from '@/schemas/common'

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type Pagination = z.infer<typeof PaginationSchema>

/** Prisma の `skip` / `take` に変換する（page は 1 始まり） */
export function toSkipTake({ page, per_page }: PaginationQuery) {
  return { skip: (page - 1) * per_page, take: per_page }
}

/** レスポンスの `pagination`。`total_pages` は切り上げ（0 件なら 0） */
export function buildPagination(total: number, { page, per_page }: PaginationQuery): Pagination {
  return { total, page, per_page, total_pages: Math.ceil(total / per_page) }
}

/** 一覧レスポンス `{ data, pagination }` */
export function paginatedResult<T>(data: T[], total: number, query: PaginationQuery) {
  return { data, pagination: buildPagination(total, query) }
}
