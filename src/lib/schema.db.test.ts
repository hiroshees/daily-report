import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  createCustomer,
  createReport,
  createSalesPerson,
  resetDatabase,
} from '../../tests/db/helpers'

/** Prisma の既知のエラーコード（P2002: 一意制約違反, P2003: 外部キー制約違反） */
async function expectPrismaError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
  expect((error as Prisma.PrismaClientKnownRequestError).code).toBe(code)
}

beforeEach(resetDatabase)
afterAll(() => prisma.$disconnect())

describe('日報の一意制約（1人1日1件）', () => {
  it('同一担当者・同一日付の日報は登録できない', async () => {
    const person = await createSalesPerson()
    await createReport(person.id, '2025-07-27')

    await expectPrismaError(createReport(person.id, '2025-07-27'), 'P2002')
  })

  it('同一担当者でも日付が違えば登録できる', async () => {
    const person = await createSalesPerson()
    await createReport(person.id, '2025-07-27')

    await expect(createReport(person.id, '2025-07-28')).resolves.toMatchObject({ id: 2 })
  })

  it('日付が同じでも担当者が違えば登録できる', async () => {
    const a = await createSalesPerson({ email: 'a@example.com' })
    const b = await createSalesPerson({ email: 'b@example.com' })
    await createReport(a.id, '2025-07-27')

    await expect(createReport(b.id, '2025-07-27')).resolves.toBeDefined()
  })
})

describe('営業担当者', () => {
  it('メールアドレスは重複できない', async () => {
    await createSalesPerson({ email: 'dup@example.com' })

    await expectPrismaError(createSalesPerson({ email: 'dup@example.com' }), 'P2002')
  })

  it('管理者フラグの既定値は false', async () => {
    const person = await prisma.salesPerson.create({
      data: { name: '佐藤', email: 's@example.com', passwordHash: 'h', department: '営業2課' },
    })
    expect(person.isManager).toBe(false)
  })
})

describe('削除ポリシー', () => {
  it('日報を削除すると訪問記録とコメントも削除される（Cascade）', async () => {
    const person = await createSalesPerson()
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })
    const customer = await createCustomer()
    const report = await createReport(person.id)
    await prisma.visitRecord.create({
      data: { reportId: report.id, customerId: customer.id, visitContent: '提案' },
    })
    await prisma.managerComment.create({
      data: { reportId: report.id, managerId: manager.id, comment: '相談しましょう' },
    })

    await prisma.dailyReport.delete({ where: { id: report.id } })

    expect(await prisma.visitRecord.count()).toBe(0)
    expect(await prisma.managerComment.count()).toBe(0)
  })

  it('日報を持つ営業担当者は削除できない（Restrict）', async () => {
    const person = await createSalesPerson()
    await createReport(person.id)

    await expectPrismaError(prisma.salesPerson.delete({ where: { id: person.id } }), 'P2003')
  })

  it('コメントを持つ管理者は削除できない（Restrict）', async () => {
    const person = await createSalesPerson()
    const manager = await createSalesPerson({ email: 'm@example.com', isManager: true })
    const report = await createReport(person.id)
    await prisma.managerComment.create({
      data: { reportId: report.id, managerId: manager.id, comment: 'OK' },
    })

    await expectPrismaError(prisma.salesPerson.delete({ where: { id: manager.id } }), 'P2003')
  })

  it('訪問記録から参照されている顧客は削除できない（Restrict）', async () => {
    const person = await createSalesPerson()
    const customer = await createCustomer()
    const report = await createReport(person.id)
    await prisma.visitRecord.create({
      data: { reportId: report.id, customerId: customer.id, visitContent: '訪問' },
    })

    await expectPrismaError(prisma.customer.delete({ where: { id: customer.id } }), 'P2003')
  })

  it('参照されていない顧客・営業担当者は削除できる', async () => {
    const person = await createSalesPerson()
    const customer = await createCustomer()

    await prisma.customer.delete({ where: { id: customer.id } })
    await prisma.salesPerson.delete({ where: { id: person.id } })

    expect(await prisma.customer.count()).toBe(0)
    expect(await prisma.salesPerson.count()).toBe(0)
  })
})

describe('日付・時刻の扱い', () => {
  it('report_date はタイムゾーンによる日付ずれなく保存される', async () => {
    const person = await createSalesPerson()
    const report = await createReport(person.id, '2025-07-27')

    const saved = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } })
    expect(saved.reportDate.toISOString().slice(0, 10)).toBe('2025-07-27')
  })

  it('visit_time は任意で、時刻のみ保存される', async () => {
    const person = await createSalesPerson()
    const customer = await createCustomer()
    const report = await createReport(person.id)

    const withTime = await prisma.visitRecord.create({
      data: {
        reportId: report.id,
        customerId: customer.id,
        visitContent: '午前訪問',
        visitTime: new Date('1970-01-01T10:00:00Z'),
      },
    })
    const withoutTime = await prisma.visitRecord.create({
      data: { reportId: report.id, customerId: customer.id, visitContent: '時刻なし' },
    })

    expect(withTime.visitTime?.toISOString().slice(11, 16)).toBe('10:00')
    expect(withoutTime.visitTime).toBeNull()
  })
})
