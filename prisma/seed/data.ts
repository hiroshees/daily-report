import { fakerJA as faker } from '@faker-js/faker'

/**
 * シードデータの生成（DB アクセスなし）。
 * 仕様: doc/TEST_DEFINITION.md 2.3
 *   営業担当者 10名（管理者2・一般8）/ 顧客 100社 / 日報 過去3ヶ月分（約600件）
 * ID は 1 からの連番を明示的に採番する（再実行しても同じ ID になり、関連を組み立てやすい）。
 */

export const SEED_PASSWORD = 'Test1234!'

const DEFAULT_SEED = 20250727
const CUSTOMER_COUNT = 100
/** 営業日のうち日報を書く確率（欠勤・外出などで約1割は書かない） */
const REPORT_RATE = 0.92
/** 日報にコメントが付く確率 */
const COMMENT_RATE = 0.3

export type SeedSalesPerson = {
  id: number
  name: string
  email: string
  passwordHash: string
  department: string
  isManager: boolean
}
export type SeedCustomer = {
  id: number
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
}
export type SeedReport = {
  id: number
  salesPersonId: number
  reportDate: Date
  problem: string
  plan: string
  createdAt: Date
  updatedAt: Date
}
export type SeedVisit = {
  id: number
  reportId: number
  customerId: number
  visitContent: string
  visitTime: Date | null
  createdAt: Date
}
export type SeedComment = {
  id: number
  reportId: number
  managerId: number
  comment: string
  createdAt: Date
}
export type SeedData = {
  salesPersons: SeedSalesPerson[]
  customers: SeedCustomer[]
  reports: SeedReport[]
  visits: SeedVisit[]
  comments: SeedComment[]
}

const SALES_PERSONS = [
  { name: '山田 太郎', email: 'yamada@example.com', department: '営業1課', isManager: false },
  { name: '田中 部長', email: 'tanaka@example.com', department: '営業1課', isManager: true },
  { name: '鈴木 花子', email: 'suzuki@example.com', department: '営業1課', isManager: false },
  { name: '佐藤 健', email: 'sato@example.com', department: '営業1課', isManager: false },
  { name: '高橋 美咲', email: 'takahashi@example.com', department: '営業2課', isManager: false },
  { name: '伊藤 誠', email: 'ito@example.com', department: '営業2課', isManager: false },
  { name: '渡辺 久美子', email: 'watanabe@example.com', department: '営業2課', isManager: false },
  { name: '小林 課長', email: 'kobayashi@example.com', department: '営業2課', isManager: true },
  { name: '加藤 大輔', email: 'kato@example.com', department: '営業3課', isManager: false },
  { name: '吉田 結衣', email: 'yoshida@example.com', department: '営業3課', isManager: false },
]

/** doc の画面例に登場する顧客は固定にする */
const FIXED_CUSTOMERS = [
  { companyName: 'ABC商事', contactPerson: '佐藤 一郎', phone: '03-1234-5678' },
  { companyName: 'XYZ工業', contactPerson: '鈴木 二郎', phone: '06-2345-6789' },
]

const AREA_CODES = ['03', '06', '045', '052', '011', '092', '075', '082']

const PROBLEMS = [
  '新規開拓の進捗が遅れている。アプローチ先のリストが不足している。',
  '競合他社の動向について情報収集したい。',
  '見積もりの値引き幅について相談したい。',
  '既存顧客からの問い合わせ対応に時間を取られ、新規訪問が減っている。',
  '提案資料のテンプレートを見直したい。',
  '大型案件の決裁者に会えておらず、進め方を相談したい。',
  '納期遅延のクレームがあり、対応方針を確認したい。',
  '特に課題なし。',
]
const PLANS = [
  '・ABC商事への見積もり作成\n・新規リスト50件に電話アプローチ',
  '・先方への提案資料の修正\n・来週訪問のアポイント調整',
  '・XYZ工業の保守契約の更新提案\n・社内で技術部門と打ち合わせ',
  '・見積もりの再提出\n・競合他社の価格調査',
  '・新規顧客3社へ訪問\n・週次報告の準備',
  '・フォローの電話連絡\n・提案書のレビュー依頼',
]
const VISIT_CONTENTS = [
  '新商品の提案を実施。次回見積もり提出予定。',
  '既存システムの保守相談。来月に再訪問する。',
  '導入事例の紹介と、課題のヒアリングを実施。',
  '見積もりを提出し、内容を説明。社内で検討いただく。',
  '契約更新の打ち合わせ。条件面を調整中。',
  '新任の担当者へ挨拶。今後の窓口を確認した。',
  'デモを実施。操作性について好評をいただいた。',
  'クレーム対応。原因と再発防止策を説明し、了承を得た。',
]
const COMMENTS = [
  '新規開拓については明日相談しましょう。',
  '見積もりの件、了解しました。値引き幅は私から確認します。',
  'フォローを忘れずに。来週の進捗も教えてください。',
  '良い提案ですね。事例資料を共有します。',
  'クレームの件、状況を引き続き報告してください。',
  'お疲れさまです。優先順位をつけて進めましょう。',
]

const DAY_MS = 24 * 60 * 60 * 1000
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

/** JST の「日付 + 時刻」を表す Date（UTC 換算）を返す */
function jst(date: Date, hour: number, minute = 0): Date {
  return new Date(date.getTime() + (hour * 60 + minute) * 60 * 1000 - JST_OFFSET_MS)
}

/** 日付を含まない時刻（Postgres の time 型用）。1970-01-01 の UTC として表現する */
function timeOfDay(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute))
}

/** 今日の日付（JST）を YYYY-MM-DD で返す */
export function todayInJst(now = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * n ヶ月前の同じ日を返す。その月に同じ日がない場合は月末に丸める（例: 5/31 の3ヶ月前は 2/28）。
 * setUTCMonth をそのまま使うと 2/31 → 3/3 のように繰り上がり、期間が短くなってしまう。
 */
export function subtractMonths(date: Date, months: number): Date {
  const firstOfTarget = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1))
  const lastDay = new Date(
    Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0),
  ).getUTCDate()
  firstOfTarget.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return firstOfTarget
}

/** 基準日の「前日」から過去3ヶ月分の営業日（月〜金）を古い順に返す。基準日（当日）は含めない */
function businessDays(baseDate: string): Date[] {
  const end = new Date(parseDate(baseDate).getTime() - DAY_MS)
  const start = subtractMonths(parseDate(baseDate), 3)

  const days: Date[] = []
  for (let d = start; d <= end; d = new Date(d.getTime() + DAY_MS)) {
    const weekday = d.getUTCDay()
    if (weekday !== 0 && weekday !== 6) days.push(d)
  }
  return days
}

export type GenerateOptions = {
  /** 基準日（YYYY-MM-DD）。この前日までの過去3ヶ月分の日報を作る。既定は今日（JST） */
  baseDate?: string
  passwordHash: string
  seed?: number
}

export function generateSeedData({
  baseDate = todayInJst(),
  passwordHash,
  seed = DEFAULT_SEED,
}: GenerateOptions): SeedData {
  faker.seed(seed)

  const salesPersons: SeedSalesPerson[] = SALES_PERSONS.map((p, i) => ({
    id: i + 1,
    passwordHash,
    ...p,
  }))
  const managers = salesPersons.filter((p) => p.isManager)

  const customers: SeedCustomer[] = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
    const fixed = FIXED_CUSTOMERS[i]
    const n = String(i + 1).padStart(3, '0')
    return {
      id: i + 1,
      companyName: fixed?.companyName ?? faker.company.name(),
      contactPerson: fixed?.contactPerson ?? faker.person.fullName(),
      phone:
        fixed?.phone ??
        `${faker.helpers.arrayElement(AREA_CODES)}-${faker.string.numeric(4)}-${faker.string.numeric(4)}`,
      email: `contact${n}@example.co.jp`,
      address: `${faker.location.state()}${faker.location.city()}${faker.location.streetAddress()}`,
    }
  })

  const reports: SeedReport[] = []
  const visits: SeedVisit[] = []
  const comments: SeedComment[] = []

  for (const day of businessDays(baseDate)) {
    for (const person of salesPersons) {
      if (!faker.datatype.boolean({ probability: REPORT_RATE })) continue

      const createdAt = jst(day, 17, faker.number.int({ min: 0, max: 59 }))
      const report: SeedReport = {
        id: reports.length + 1,
        salesPersonId: person.id,
        reportDate: day,
        problem: faker.helpers.arrayElement(PROBLEMS),
        plan: faker.helpers.arrayElement(PLANS),
        createdAt,
        updatedAt: createdAt,
      }
      reports.push(report)

      // 訪問記録 1〜5件。同じ日報で同じ顧客は重複させず、訪問時刻は昇順にする
      const visitCount = faker.number.int({ min: 1, max: 5 })
      const visitedCustomers = faker.helpers.arrayElements(customers, visitCount)
      const slots = faker.helpers
        .arrayElements(
          Array.from({ length: 18 }, (_, i) => 9 * 60 + i * 30), // 9:00〜17:30 を30分刻み
          visitCount,
        )
        .sort((a, b) => a - b)

      visitedCustomers.forEach((customer, i) => {
        const slot = slots[i] ?? 9 * 60
        visits.push({
          id: visits.length + 1,
          reportId: report.id,
          customerId: customer.id,
          visitContent: faker.helpers.arrayElement(VISIT_CONTENTS),
          // 一部の訪問は時刻を記録しない（任意項目）
          visitTime: faker.datatype.boolean({ probability: 0.9 })
            ? timeOfDay(Math.floor(slot / 60), slot % 60)
            : null,
          createdAt,
        })
      })

      // 一部の日報に管理者がコメント（本人以外の管理者。日報の当日 18〜20 時台）
      if (faker.datatype.boolean({ probability: COMMENT_RATE })) {
        const candidates = managers.filter((m) => m.id !== person.id)
        const commentCount = faker.number.int({ min: 1, max: 2 })
        for (let i = 0; i < commentCount; i++) {
          comments.push({
            id: comments.length + 1,
            reportId: report.id,
            managerId: faker.helpers.arrayElement(candidates).id,
            comment: faker.helpers.arrayElement(COMMENTS),
            createdAt: jst(day, 18 + i, faker.number.int({ min: 0, max: 59 })),
          })
        }
      }
    }
  }

  return { salesPersons, customers, reports, visits, comments }
}
