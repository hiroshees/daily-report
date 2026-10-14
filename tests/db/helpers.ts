import { prisma } from '@/lib/prisma'

/** 全テーブルを空にして採番もリセットする（テストの独立性を保つ） */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "manager_comment", "visit_record", "daily_report", "customer", "sales_person" RESTART IDENTITY CASCADE',
  )
}

export function createSalesPerson(overrides: { email?: string; isManager?: boolean } = {}) {
  return prisma.salesPerson.create({
    data: {
      name: '山田太郎',
      email: overrides.email ?? 'yamada@example.com',
      passwordHash: 'hash',
      department: '営業1課',
      isManager: overrides.isManager ?? false,
    },
  })
}

export function createCustomer(companyName = 'ABC商事') {
  return prisma.customer.create({ data: { companyName } })
}

export function createReport(salesPersonId: number, reportDate = '2025-07-27') {
  return prisma.dailyReport.create({
    data: { salesPersonId, reportDate: new Date(reportDate), problem: '課題', plan: '計画' },
  })
}
