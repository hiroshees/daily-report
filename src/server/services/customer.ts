import { Prisma, type Customer } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  CustomerCreateRequest,
  CustomerListQuery,
  CustomerUpdateRequest,
} from '@/schemas/customer'
import { ApiError } from '@/server/errors'
import { paginatedResult, toSkipTake } from '@/server/pagination'

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

const toSummary = (customer: Customer) => ({
  id: customer.id,
  company_name: customer.companyName,
  contact_person: customer.contactPerson,
  phone: customer.phone,
  email: customer.email,
})

const toIso = (date: Date) => date.toISOString().replace('.000Z', 'Z')

// PUT は全項目の置き換え。省略された任意項目は null（未設定）にする
const toData = (input: CustomerCreateRequest | CustomerUpdateRequest) => ({
  companyName: input.company_name,
  contactPerson: input.contact_person ?? null,
  phone: input.phone ?? null,
  email: input.email ?? null,
  address: input.address ?? null,
})

/**
 * LIKE のワイルドカード（`%` `_`）とエスケープ文字（`\`）をリテラルにする。
 * Prisma の `contains` は値をパラメータ化するが、これらはエスケープしない（PostgreSQL の LIKE の既定の
 * エスケープ文字はバックスラッシュ）。
 */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&')

/** 会社名/担当者名の部分一致検索（大文字小文字を区別しない） */
export async function listCustomers(query: CustomerListQuery) {
  const trimmed = query.search?.trim()
  const keyword = trimmed ? escapeLike(trimmed) : undefined
  const where: Prisma.CustomerWhereInput = keyword
    ? {
        OR: [
          { companyName: { contains: keyword, mode: 'insensitive' } },
          { contactPerson: { contains: keyword, mode: 'insensitive' } },
        ],
      }
    : {}

  const [total, rows] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { id: 'asc' }, ...toSkipTake(query) }),
  ])
  return paginatedResult(rows.map(toSummary), total, query)
}

export async function getCustomer(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) throw new ApiError('NOT_FOUND')
  return {
    ...toSummary(customer),
    address: customer.address,
    created_at: toIso(customer.createdAt),
    updated_at: toIso(customer.updatedAt),
  }
}

export async function createCustomer(input: CustomerCreateRequest) {
  const customer = await prisma.customer.create({ data: toData(input) })
  return {
    ...toSummary(customer),
    address: customer.address,
    created_at: toIso(customer.createdAt),
  }
}

export async function updateCustomer(id: number, input: CustomerUpdateRequest) {
  try {
    const customer = await prisma.customer.update({ where: { id }, data: toData(input) })
    return {
      ...toSummary(customer),
      address: customer.address,
      updated_at: toIso(customer.updatedAt),
    }
  } catch (error) {
    if (isPrismaError(error, 'P2025')) throw new ApiError('NOT_FOUND')
    throw error
  }
}

/** 訪問記録から参照されている顧客は削除不可（409 RESOURCE_IN_USE）。参照がなければ物理削除 */
export async function deleteCustomer(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id } })
      if (!current) throw new ApiError('NOT_FOUND')
      if ((await tx.visitRecord.count({ where: { customerId: id } })) > 0) {
        throw new ApiError('RESOURCE_IN_USE')
      }
      await tx.customer.delete({ where: { id } })
    })
  } catch (error) {
    // 確認後に訪問記録が追加された場合（外部キー制約違反）
    if (isPrismaError(error, 'P2003')) throw new ApiError('RESOURCE_IN_USE')
    throw error
  }
}
