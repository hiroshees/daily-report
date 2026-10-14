// @vitest-environment node
import { GET as listReportsRoute } from '@/app/api/v1/reports/route'
import { prisma } from '@/lib/prisma'
import { ReportListItemSchema } from '@/schemas/report'
import { signSessionToken } from '@/server/jwt'
import { createCustomer, createSalesPerson, resetDatabase } from '../db/helpers'

// 実行された SQL を記録する PrismaClient に差し替える（N+1 になっていないことを確認するため）。
// vi.spyOn は Prisma のモデル操作（Proxy）に使えない: 復元時にメソッドが消えて、以降のテストが壊れる
const executedQueries = vi.hoisted(() => [] as string[])
vi.mock('@/lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] })
  prisma.$on('query', (event) => executedQueries.push(event.query))
  return { prisma }
})

const NO_PARAMS = { params: Promise.resolve({}) }

type Person = Awaited<ReturnType<typeof createSalesPerson>>

/** ログインしたユーザーとして一覧 API を呼ぶ（token が無ければ未ログイン） */
async function getList(query: string, token?: string) {
  const response = await listReportsRoute(
    new Request(`http://localhost/api/v1/reports${query}`, {
      headers: token ? { Cookie: `session=${token}` } : {},
    }),
    NO_PARAMS,
  )
  return { response, body: await response.json() }
}

const tokenOf = async (person: Person) => (await signSessionToken(person.id)).token

const report = (salesPersonId: number, reportDate: string) =>
  prisma.dailyReport.create({
    data: {
      salesPersonId,
      reportDate: new Date(`${reportDate}T00:00:00Z`),
      problem: 'p',
      plan: 'p',
    },
  })

const dates = (body: { data: { report_date: string }[] }) => body.data.map((r) => r.report_date)
const ids = (body: { data: { id: number }[] }) => body.data.map((r) => r.id)

let yamada: Person
let suzuki: Person
let tanaka: Person // 管理者

beforeEach(async () => {
  await resetDatabase()
  yamada = await createSalesPerson({ email: 'yamada@example.com' })
  suzuki = await createSalesPerson({ email: 'suzuki@example.com' })
  tanaka = await createSalesPerson({ email: 'tanaka@example.com', isManager: true })
})
afterAll(() => prisma.$disconnect())

describe('認証・閲覧範囲', () => {
  it('未ログインは 401', async () => {
    const { response, body } = await getList('')

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('AUTH_UNAUTHORIZED')
  })

  it('一般ユーザーも、他人の日報を含む全員分を閲覧できる', async () => {
    await report(yamada.id, '2025-07-27')
    await report(suzuki.id, '2025-07-27')

    const { response, body } = await getList('', await tokenOf(yamada))

    expect(response.status).toBe(200)
    expect(
      body.data.map((r: { sales_person: { id: number } }) => r.sales_person.id).sort(),
    ).toEqual([yamada.id, suzuki.id].sort())
  })

  it('管理者も全員分を閲覧できる（階層は持たない）', async () => {
    await report(yamada.id, '2025-07-27')
    await report(suzuki.id, '2025-07-27')

    const { body } = await getList('', await tokenOf(tanaka))

    expect(body.pagination.total).toBe(2)
  })
})

describe('レスポンスの形式', () => {
  it('仕様どおりの項目だけを返す（本文などは含めない）', async () => {
    const r = await report(yamada.id, '2025-07-27')

    const { body } = await getList('', await tokenOf(yamada))

    expect(body).toEqual({
      data: [
        {
          id: r.id,
          report_date: '2025-07-27',
          sales_person: { id: yamada.id, name: '山田太郎' },
          visit_count: 0,
          has_comments: false,
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        },
      ],
      pagination: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    })
    const text = JSON.stringify(body)
    expect(text).not.toContain('problem')
    expect(text).not.toContain('plan')
    expect(text).not.toContain('email')
  })

  it('一覧の各行が、OpenAPI のスキーマ（ReportListItem）に一致する', async () => {
    await report(yamada.id, '2025-07-27')

    const { body } = await getList('', await tokenOf(yamada))

    expect(ReportListItemSchema.parse(body.data[0])).toBeTruthy()
  })

  it('0 件でも 200（data は空、total_pages は 0）', async () => {
    const { response, body } = await getList('', await tokenOf(yamada))

    expect(response.status).toBe(200)
    expect(body).toEqual({
      data: [],
      pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    })
  })
})

describe('訪問記録の件数・コメントの有無（visit_count / has_comments）', () => {
  it('日報ごとに正しく集計する', async () => {
    const customer = await createCustomer()
    const none = await report(yamada.id, '2025-07-25')
    const three = await report(yamada.id, '2025-07-26')
    const commented = await report(yamada.id, '2025-07-27')
    await prisma.visitRecord.createMany({
      data: [1, 2, 3].map((n) => ({
        reportId: three.id,
        customerId: customer.id,
        visitContent: `訪問${n}`,
      })),
    })
    await prisma.visitRecord.create({
      data: { reportId: commented.id, customerId: customer.id, visitContent: '訪問' },
    })
    await prisma.managerComment.createMany({
      data: [
        { reportId: commented.id, managerId: tanaka.id, comment: '1件目' },
        { reportId: commented.id, managerId: tanaka.id, comment: '2件目' },
      ],
    })

    const { body } = await getList('', await tokenOf(yamada))

    const byId = new Map(
      body.data.map((r: { id: number; visit_count: number; has_comments: boolean }) => [r.id, r]),
    )
    expect(byId.get(none.id)).toMatchObject({ visit_count: 0, has_comments: false })
    expect(byId.get(three.id)).toMatchObject({ visit_count: 3, has_comments: false })
    // コメントが複数あっても、訪問記録の件数が重複して数えられない
    expect(byId.get(commented.id)).toMatchObject({ visit_count: 1, has_comments: true })
  })

  it('日報の件数が増えても、実行される SQL の数は変わらない（行ごとの追加の問い合わせをしない = N+1 を避ける）', async () => {
    const customer = await createCustomer()
    const token = await tokenOf(yamada)

    async function queriesFor(reportCount: number) {
      await prisma.dailyReport.deleteMany()
      for (let day = 1; day <= reportCount; day++) {
        const r = await report(yamada.id, `2025-07-${String(day).padStart(2, '0')}`)
        await prisma.visitRecord.create({
          data: { reportId: r.id, customerId: customer.id, visitContent: '訪問' },
        })
        await prisma.managerComment.create({
          data: { reportId: r.id, managerId: tanaka.id, comment: 'コメント' },
        })
      }
      executedQueries.length = 0
      const { body } = await getList('?per_page=100', token)
      await new Promise((resolve) => setTimeout(resolve, 50)) // クエリのイベントが届くのを待つ
      expect(body.data).toHaveLength(reportCount)
      return executedQueries.length
    }

    const withTwo = await queriesFor(2)
    const withTwentyFive = await queriesFor(25)

    expect(withTwentyFive).toBe(withTwo)
  })
})

describe('並び順（report_date 降順 → id 降順）', () => {
  it('日付の新しい順。同じ日付なら id の大きい順', async () => {
    const old = await report(yamada.id, '2025-07-25')
    const newest = await report(yamada.id, '2025-07-27')
    const sameDayFirst = await report(suzuki.id, '2025-07-26')
    const sameDaySecond = await report(yamada.id, '2025-07-26')

    const { body } = await getList('', await tokenOf(yamada))

    expect(ids(body)).toEqual([newest.id, sameDaySecond.id, sameDayFirst.id, old.id])
  })
})

describe('期間での絞り込み（start_date / end_date、両端を含む）', () => {
  beforeEach(async () => {
    for (const day of ['2025-07-24', '2025-07-25', '2025-07-26', '2025-07-27', '2025-07-28']) {
      await report(yamada.id, day)
    }
  })

  it('開始日・終了日の当日を含む', async () => {
    const { body } = await getList(
      '?start_date=2025-07-25&end_date=2025-07-27',
      await tokenOf(yamada),
    )

    expect(dates(body)).toEqual(['2025-07-27', '2025-07-26', '2025-07-25'])
  })

  it('開始日だけ・終了日だけでも絞り込める', async () => {
    const token = await tokenOf(yamada)

    expect(dates((await getList('?start_date=2025-07-27', token)).body)).toEqual([
      '2025-07-28',
      '2025-07-27',
    ])
    expect(dates((await getList('?end_date=2025-07-25', token)).body)).toEqual([
      '2025-07-25',
      '2025-07-24',
    ])
  })

  it('開始日と終了日が同じなら、その日の日報だけ', async () => {
    const { body } = await getList(
      '?start_date=2025-07-26&end_date=2025-07-26',
      await tokenOf(yamada),
    )
    expect(dates(body)).toEqual(['2025-07-26'])
  })

  it('範囲に日報が無ければ 0 件', async () => {
    const { body } = await getList('?start_date=2026-01-01', await tokenOf(yamada))
    expect(body.data).toEqual([])
    expect(body.pagination.total).toBe(0)
  })

  it('開始日が終了日より後なら 400（end_date に表示）', async () => {
    const { response, body } = await getList(
      '?start_date=2025-07-28&end_date=2025-07-27',
      await tokenOf(yamada),
    )

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([
      { field: 'end_date', message: '終了日は開始日以降の日付を指定してください' },
    ])
  })

  it.each(['2025-02-30', '2025/07/27', '20250727', 'abc', '2025-7-27'])(
    '不正な日付 %s は 400',
    async (value) => {
      const { response, body } = await getList(`?start_date=${value}`, await tokenOf(yamada))

      expect(response.status).toBe(400)
      expect(body.error.details[0].field).toBe('start_date')
    },
  )
})

describe('実行環境のタイムゾーンに左右されない（日付がずれない）', () => {
  const original = process.env.TZ
  afterEach(() => {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  })

  it.each(['Asia/Tokyo', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
    'TZ=%s でも、指定した日の日報が、その日付のまま返る',
    async (tz) => {
      process.env.TZ = tz
      await report(yamada.id, '2025-07-26')
      const target = await report(yamada.id, '2025-07-27')
      await report(yamada.id, '2025-07-28')

      const { body } = await getList(
        '?start_date=2025-07-27&end_date=2025-07-27',
        await tokenOf(yamada),
      )

      expect(body.data).toHaveLength(1)
      expect(body.data[0]).toMatchObject({ id: target.id, report_date: '2025-07-27' })
    },
  )
})

describe('担当者での絞り込み（sales_person_id）', () => {
  beforeEach(async () => {
    await report(yamada.id, '2025-07-27')
    await report(suzuki.id, '2025-07-27')
    await report(suzuki.id, '2025-07-26')
  })

  it('管理者は担当者で絞り込める', async () => {
    const { body } = await getList(`?sales_person_id=${suzuki.id}`, await tokenOf(tanaka))

    expect(body.pagination.total).toBe(2)
    expect(
      body.data.every((r: { sales_person: { id: number } }) => r.sales_person.id === suzuki.id),
    ).toBe(true)
  })

  it('管理者が存在しない担当者を指定すると 0 件（エラーではない）', async () => {
    const { response, body } = await getList('?sales_person_id=99999', await tokenOf(tanaka))

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('一般ユーザーが指定しても無視して、全員分を返す（403 にしない）', async () => {
    const { response, body } = await getList(`?sales_person_id=${suzuki.id}`, await tokenOf(yamada))

    expect(response.status).toBe(200)
    expect(body.pagination.total).toBe(3)
    expect(
      new Set(body.data.map((r: { sales_person: { id: number } }) => r.sales_person.id)),
    ).toEqual(new Set([yamada.id, suzuki.id]))
  })

  it('無視されても、期間の絞り込みは有効', async () => {
    const { body } = await getList(
      `?sales_person_id=${yamada.id}&start_date=2025-07-27&end_date=2025-07-27`,
      await tokenOf(suzuki),
    )

    expect(body.pagination.total).toBe(2) // 7/27 の全員分（yamada と suzuki）
  })

  it('sales_person_id の形式が不正なら 400', async () => {
    const token = await tokenOf(tanaka)
    for (const value of ['abc', '0', '-1', '1.5']) {
      expect((await getList(`?sales_person_id=${value}`, token)).response.status, value).toBe(400)
    }
  })
})

describe('ページネーション', () => {
  /** n 件の日報（日付が重ならないよう、担当者を分ける） */
  async function createReports(count: number) {
    const people = [yamada, suzuki, tanaka]
    for (let i = 0; i < count; i++) {
      const day = String((i % 28) + 1).padStart(2, '0')
      const month = String(Math.floor(i / 28 / people.length) + 1).padStart(2, '0')
      await report(people[Math.floor(i / 28) % people.length]!.id, `2025-${month}-${day}`)
    }
  }

  it('既定は 1 ページ 20 件。total・total_pages を返す', async () => {
    await createReports(45)

    const { body } = await getList('', await tokenOf(yamada))

    expect(body.data).toHaveLength(20)
    expect(body.pagination).toEqual({ total: 45, page: 1, per_page: 20, total_pages: 3 })
  })

  it('2 ページ目以降を取得でき、ページをまたいで重複・欠落がない', async () => {
    await createReports(45)
    const token = await tokenOf(yamada)

    const all = [
      ...ids((await getList('?page=1', token)).body),
      ...ids((await getList('?page=2', token)).body),
      ...ids((await getList('?page=3', token)).body),
    ]

    expect(all).toHaveLength(45)
    expect(new Set(all).size).toBe(45)
    expect(ids((await getList('?page=3', token)).body)).toHaveLength(5)
  })

  it('per_page を指定できる（上限 100）', async () => {
    await createReports(30)
    const token = await tokenOf(yamada)

    expect((await getList('?per_page=10', token)).body.data).toHaveLength(10)
    expect((await getList('?per_page=100', token)).body.pagination.per_page).toBe(100)
  })

  it('範囲外のページは 0 件（エラーではない）', async () => {
    await createReports(5)

    const { response, body } = await getList('?page=9', await tokenOf(yamada))

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.pagination).toEqual({ total: 5, page: 9, per_page: 20, total_pages: 1 })
  })

  it.each(['page=0', 'page=-1', 'page=abc', 'per_page=0', 'per_page=101', 'per_page=abc'])(
    '不正な指定（%s）は 400',
    async (query) => {
      expect((await getList(`?${query}`, await tokenOf(yamada))).response.status).toBe(400)
    },
  )

  it('絞り込みと組み合わせたとき、total は絞り込み後の件数', async () => {
    await createReports(45)
    const { body } = await getList(
      `?sales_person_id=${yamada.id}&per_page=5`,
      await tokenOf(tanaka),
    )

    const expected = await prisma.dailyReport.count({ where: { salesPersonId: yamada.id } })
    expect(body.pagination.total).toBe(expected)
    expect(body.pagination.total_pages).toBe(Math.ceil(expected / 5))
  })
})
