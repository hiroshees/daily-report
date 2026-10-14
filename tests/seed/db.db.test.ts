import { prisma } from '@/lib/prisma'
import { syncSequences, truncateAllTables } from '../../prisma/seed/db'
import { createCustomer, createReport, createSalesPerson, resetDatabase } from '../db/helpers'

beforeEach(resetDatabase)
afterAll(() => prisma.$disconnect())

describe('truncateAllTables', () => {
  it('全テーブルを空にし、採番を 1 に戻す', async () => {
    const person = await createSalesPerson()
    await createCustomer()
    await createReport(person.id)

    await truncateAllTables(prisma)

    expect(await prisma.salesPerson.count()).toBe(0)
    expect(await prisma.customer.count()).toBe(0)
    expect(await prisma.dailyReport.count()).toBe(0)
    expect((await createCustomer()).id).toBe(1)
  })
})

describe('syncSequences', () => {
  it('明示した ID で投入した後、次の採番が最大 ID + 1 になる', async () => {
    await prisma.customer.createMany({
      data: [
        { id: 1, companyName: 'A社' },
        { id: 5, companyName: 'B社' },
      ],
    })

    await syncSequences(prisma)

    expect((await createCustomer()).id).toBe(6)
  })

  it('空のテーブルは次の採番が 1 のままになる（2 から始まらない）', async () => {
    await syncSequences(prisma)

    expect((await createCustomer()).id).toBe(1)
  })
})
