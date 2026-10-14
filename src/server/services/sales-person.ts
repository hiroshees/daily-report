import bcrypt from 'bcryptjs'
import { Prisma, type SalesPerson } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  SalesPersonCreateRequest,
  SalesPersonListQuery,
  SalesPersonUpdateRequest,
} from '@/schemas/sales-person'
import { ApiError } from '@/server/errors'
import { normalizeEmail } from '@/server/services/auth'

/** ログイン時の照合（services/auth.ts）と同じコスト */
const BCRYPT_ROUNDS = 10

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code

/** 一意制約違反（P2002）はメールアドレスの重複として 409 にする */
function rethrowDuplicateEmail(error: unknown): never {
  if (isPrismaError(error, 'P2002')) throw new ApiError('DUPLICATE_EMAIL')
  throw error
}

/** パスワードのハッシュは含めない */
const toResponse = (person: SalesPerson) => ({
  id: person.id,
  name: person.name,
  email: person.email,
  department: person.department,
  is_manager: person.isManager,
})

const toIso = (date: Date) => date.toISOString().replace('.000Z', 'Z')

export async function listSalesPersons(query: SalesPersonListQuery) {
  const people = await prisma.salesPerson.findMany({
    where: {
      ...(query.department !== undefined && { department: query.department }),
      ...(query.is_manager !== undefined && { isManager: query.is_manager === 'true' }),
    },
    orderBy: { id: 'asc' },
  })
  return { data: people.map(toResponse) }
}

async function findOrThrow(id: number) {
  const person = await prisma.salesPerson.findUnique({ where: { id } })
  if (!person) throw new ApiError('NOT_FOUND')
  return person
}

export async function getSalesPerson(id: number) {
  const person = await findOrThrow(id)
  return {
    ...toResponse(person),
    created_at: toIso(person.createdAt),
    updated_at: toIso(person.updatedAt),
  }
}

export async function createSalesPerson(input: SalesPersonCreateRequest) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  try {
    const person = await prisma.salesPerson.create({
      data: {
        name: input.name,
        email: normalizeEmail(input.email),
        passwordHash,
        department: input.department,
        isManager: input.is_manager,
      },
    })
    return { ...toResponse(person), created_at: toIso(person.createdAt) }
  } catch (error) {
    rethrowDuplicateEmail(error)
  }
}

/** 管理者が 1 人もいなくなる変更は不可 */
async function assertNotLastManager(tx: Prisma.TransactionClient, id: number) {
  const others = await tx.salesPerson.count({ where: { isManager: true, id: { not: id } } })
  if (others === 0) {
    throw new ApiError('RESOURCE_IN_USE', '最後の管理者は降格・削除できません')
  }
}

export async function updateSalesPerson(id: number, input: SalesPersonUpdateRequest) {
  try {
    const person = await prisma.$transaction(
      async (tx) => {
        const current = await tx.salesPerson.findUnique({ where: { id } })
        if (!current) throw new ApiError('NOT_FOUND')
        if (current.isManager && !input.is_manager) await assertNotLastManager(tx, id)

        return tx.salesPerson.update({
          where: { id },
          data: {
            name: input.name,
            email: normalizeEmail(input.email),
            department: input.department,
            isManager: input.is_manager,
          },
        })
      },
      // 管理者が同時に降格されて 0 人になるのを防ぐ
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    return { ...toResponse(person), updated_at: toIso(person.updatedAt) }
  } catch (error) {
    rethrowDuplicateEmail(error)
  }
}

export async function deleteSalesPerson(id: number, currentUserId: number) {
  if (id === currentUserId) {
    throw new ApiError('RESOURCE_IN_USE', '自分自身は削除できません')
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        const current = await tx.salesPerson.findUnique({ where: { id } })
        if (!current) throw new ApiError('NOT_FOUND')
        if (current.isManager) await assertNotLastManager(tx, id)

        const [reports, comments] = await Promise.all([
          tx.dailyReport.count({ where: { salesPersonId: id } }),
          tx.managerComment.count({ where: { managerId: id } }),
        ])
        if (reports + comments > 0) throw new ApiError('RESOURCE_IN_USE')

        await tx.salesPerson.delete({ where: { id } })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    // 確認後に参照が追加された場合（外部キー制約違反）
    if (isPrismaError(error, 'P2003')) throw new ApiError('RESOURCE_IN_USE')
    throw error
  }
}
