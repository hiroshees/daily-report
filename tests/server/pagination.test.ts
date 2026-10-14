import { PaginationQuerySchema, PaginationSchema } from '@/schemas/common'
import { buildPagination, paginatedResult, toSkipTake } from '@/server/pagination'

const query = (page: number, per_page = 20) => ({ page, per_page })

describe('toSkipTake', () => {
  it('page は 1 始まりで、skip = (page - 1) * per_page', () => {
    expect(toSkipTake(query(1))).toEqual({ skip: 0, take: 20 })
    expect(toSkipTake(query(3))).toEqual({ skip: 40, take: 20 })
    expect(toSkipTake(query(2, 50))).toEqual({ skip: 50, take: 50 })
  })
})

describe('buildPagination（total_pages は切り上げ）', () => {
  it.each([
    [0, 0],
    [1, 1],
    [20, 1],
    [21, 2],
    [100, 5],
    [101, 6],
  ])('total=%i（per_page=20）→ total_pages=%i', (total, totalPages) => {
    expect(buildPagination(total, query(1))).toEqual({
      total,
      page: 1,
      per_page: 20,
      total_pages: totalPages,
    })
  })

  it('範囲外のページでもそのまま返す（data は空になる想定）', () => {
    expect(buildPagination(10, query(5))).toMatchObject({ page: 5, total_pages: 1 })
  })
})

describe('paginatedResult', () => {
  it('{ data, pagination } を返し、API のスキーマに一致する', () => {
    const result = paginatedResult([{ id: 1 }, { id: 2 }], 42, query(2, 20))

    expect(result.data).toHaveLength(2)
    expect(PaginationSchema.parse(result.pagination)).toEqual({
      total: 42,
      page: 2,
      per_page: 20,
      total_pages: 3,
    })
  })
})

describe('クエリの既定値と上限（PaginationQuerySchema）', () => {
  it('page 既定 1・per_page 既定 20、per_page は 100 まで', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, per_page: 20 })
    expect(PaginationQuerySchema.safeParse({ per_page: '100' }).success).toBe(true)
    expect(PaginationQuerySchema.safeParse({ per_page: '101' }).success).toBe(false)
  })
})
