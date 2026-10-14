import { CommentCreateRequestSchema } from '@/schemas/comment'
import { IdParamSchema } from '@/schemas/common'
import { LoginRequestSchema } from '@/schemas/auth'
import { CustomerCreateRequestSchema } from '@/schemas/customer'
import {
  ReportCreateRequestSchema,
  ReportListQuerySchema,
  ReportUpdateRequestSchema,
} from '@/schemas/report'
import { issuesOf } from './helpers'

const validReport = {
  report_date: '2025-07-27',
  problem: '課題',
  plan: '計画',
  visits: [{ customer_id: 10, visit_time: '10:00', visit_content: '提案' }],
}
const report = (overrides: object) => ({ ...validReport, ...overrides })
const visit = (overrides: object) => ({ customer_id: 1, visit_content: '訪問', ...overrides })

describe('文字数の境界値（doc/SCREEN_DESIGN.md 5章）', () => {
  it('訪問内容: 500文字は OK、501文字はエラー', () => {
    const run = (n: number) =>
      issuesOf(
        ReportCreateRequestSchema,
        report({ visits: [visit({ visit_content: 'あ'.repeat(n) })] }),
      )

    expect(run(500)).toEqual([])
    expect(run(501)).toEqual([
      ['visits.0.visit_content', '訪問内容は500文字以内で入力してください'],
    ])
  })

  it('課題・相談: 1000文字は OK、1001文字はエラー', () => {
    const run = (n: number) =>
      issuesOf(ReportCreateRequestSchema, report({ problem: 'あ'.repeat(n) }))

    expect(run(1000)).toEqual([])
    expect(run(1001)).toEqual([['problem', '課題・相談は1000文字以内で入力してください']])
  })

  it('明日の計画: 1000文字は OK、1001文字はエラー', () => {
    const run = (n: number) => issuesOf(ReportCreateRequestSchema, report({ plan: 'あ'.repeat(n) }))

    expect(run(1000)).toEqual([])
    expect(run(1001)).toEqual([['plan', '明日の計画は1000文字以内で入力してください']])
  })

  it('コメント: 500文字は OK、501文字はエラー', () => {
    const run = (n: number) => issuesOf(CommentCreateRequestSchema, { comment: 'あ'.repeat(n) })

    expect(run(500)).toEqual([])
    expect(run(501)).toEqual([['comment', 'コメントは500文字以内で入力してください']])
  })

  it('文字数はコードポイントで数える（絵文字を2文字として数えない）', () => {
    const emoji = (n: number) => '😀'.repeat(n) // UTF-16 では1つ2文字分

    expect(issuesOf(CommentCreateRequestSchema, { comment: emoji(500) })).toEqual([])
    expect(issuesOf(CommentCreateRequestSchema, { comment: emoji(501) })).toHaveLength(1)
  })
})

describe('必須項目', () => {
  it('未指定・空文字・空白のみは「必須項目です」', () => {
    const message = '課題・相談は必須項目です'

    expect(issuesOf(ReportCreateRequestSchema, report({ problem: undefined }))).toEqual([
      ['problem', message],
    ])
    expect(issuesOf(ReportCreateRequestSchema, report({ problem: '' }))).toEqual([
      ['problem', message],
    ])
    expect(issuesOf(ReportCreateRequestSchema, report({ problem: ' \n　' }))).toEqual([
      ['problem', message],
    ])
  })

  it('文字列以外が来た場合は「値が正しくありません」', () => {
    expect(issuesOf(ReportCreateRequestSchema, report({ plan: 123 }))).toEqual([
      ['plan', '明日の計画の値が正しくありません'],
    ])
  })

  it('訪問内容・顧客IDも必須', () => {
    expect(
      issuesOf(ReportCreateRequestSchema, report({ visits: [{ visit_time: '10:00' }] })).map(
        ([path]) => path,
      ),
    ).toEqual(['visits.0.customer_id', 'visits.0.visit_content'])
  })

  it('複数の入力エラーを項目ごとにまとめて返す', () => {
    expect(
      issuesOf(ReportCreateRequestSchema, {
        report_date: 'x',
        problem: '',
        plan: '',
        visits: [],
      }).map(([path]) => path),
    ).toEqual(['report_date', 'problem', 'plan'])
  })
})

describe('ログイン（メールアドレス・パスワード）', () => {
  it('正しい入力は OK', () => {
    expect(
      issuesOf(LoginRequestSchema, { email: 'yamada@example.com', password: 'Test1234!' }),
    ).toEqual([])
  })

  it('メールアドレスは必須・メール形式', () => {
    expect(issuesOf(LoginRequestSchema, { email: '', password: 'Test1234!' })).toEqual([
      ['email', 'メールアドレスは必須項目です'],
    ])
    expect(issuesOf(LoginRequestSchema, { email: 'invalid-email', password: 'Test1234!' })).toEqual(
      [['email', 'メールアドレスの形式が正しくありません']],
    )
    expect(issuesOf(LoginRequestSchema, { password: 'Test1234!' })).toEqual([
      ['email', 'メールアドレスは必須項目です'],
    ])
  })

  it('パスワードは必須・8文字以上（7文字はエラー、8文字は OK）', () => {
    expect(issuesOf(LoginRequestSchema, { email: 'a@example.com', password: '1234567' })).toEqual([
      ['password', 'パスワードは8文字以上で入力してください'],
    ])
    expect(issuesOf(LoginRequestSchema, { email: 'a@example.com', password: '12345678' })).toEqual(
      [],
    )
    expect(issuesOf(LoginRequestSchema, { email: 'a@example.com', password: '' })).toEqual([
      ['password', 'パスワードは必須項目です'],
    ])
  })

  it('パスワードの前後の空白は削らない', () => {
    expect(issuesOf(LoginRequestSchema, { email: 'a@example.com', password: '       a' })).toEqual(
      [],
    )
  })
})

describe('訪問時刻（任意・HH:mm）', () => {
  const run = (visit_time: unknown) =>
    issuesOf(ReportCreateRequestSchema, report({ visits: [visit({ visit_time })] }))

  it.each(['00:00', '09:30', '10:00', '23:59'])('%s は OK', (value) => {
    expect(run(value)).toEqual([])
  })

  it('未指定・null は OK（任意項目）', () => {
    expect(run(undefined)).toEqual([])
    expect(run(null)).toEqual([])
  })

  it.each(['24:00', '9:00', '10:60', '10:00:00', '1000', ''])('%j はエラー', (value) => {
    expect(run(value)).toEqual([['visits.0.visit_time', '訪問時刻はHH:mm形式で入力してください']])
  })
})

describe('日付（YYYY-MM-DD）', () => {
  const run = (report_date: unknown) => issuesOf(ReportCreateRequestSchema, report({ report_date }))

  it.each(['2025-07-27', '2024-02-29'])('%s は OK', (value) => {
    expect(run(value)).toEqual([])
  })

  it.each(['2025-02-30', '2025-13-01', '2025/07/27', '20250727', '2025-7-27', 'abc'])(
    '%j はエラー',
    (value) => {
      expect(run(value)).toEqual([['report_date', '日報日付はYYYY-MM-DD形式で入力してください']])
    },
  )
})

describe('日報更新', () => {
  it('訪問記録の id は任意（あれば更新、なければ新規）', () => {
    const input = {
      problem: '課題',
      plan: '計画',
      visits: [{ id: 1, customer_id: 10, visit_content: '更新' }, visit({})],
    }
    expect(issuesOf(ReportUpdateRequestSchema, input)).toEqual([])
    expect(
      issuesOf(ReportUpdateRequestSchema, { ...input, visits: [{ ...visit({}), id: 0 }] }),
    ).toHaveLength(1)
  })

  it('日付・作成者は更新対象外（リクエストに含まれていても結果に残らない）', () => {
    const parsed = ReportUpdateRequestSchema.parse({
      problem: '課題',
      plan: '計画',
      visits: [],
      report_date: '2025-01-01',
      sales_person_id: 99,
    })
    expect(parsed).not.toHaveProperty('report_date')
    expect(parsed).not.toHaveProperty('sales_person_id')
  })
})

describe('日報一覧のクエリ', () => {
  it('未指定なら page=1, per_page=20（文字列は数値に変換される）', () => {
    expect(ReportListQuerySchema.parse({})).toMatchObject({ page: 1, per_page: 20 })
    expect(
      ReportListQuerySchema.parse({ page: '3', per_page: '50', sales_person_id: '2' }),
    ).toMatchObject({
      page: 3,
      per_page: 50,
      sales_person_id: 2,
    })
  })

  it('page は1以上、per_page は1〜100', () => {
    expect(issuesOf(ReportListQuerySchema, { page: '0' })).toHaveLength(1)
    expect(issuesOf(ReportListQuerySchema, { per_page: '0' })).toHaveLength(1)
    expect(issuesOf(ReportListQuerySchema, { per_page: '100' })).toEqual([])
    expect(issuesOf(ReportListQuerySchema, { per_page: '101' })).toHaveLength(1)
    expect(issuesOf(ReportListQuerySchema, { page: 'abc' })).toHaveLength(1)
  })

  it('開始日が終了日より後ならエラー（同日は OK）', () => {
    expect(
      issuesOf(ReportListQuerySchema, { start_date: '2025-07-28', end_date: '2025-07-27' }),
    ).toEqual([['end_date', '終了日は開始日以降の日付を指定してください']])
    expect(
      issuesOf(ReportListQuerySchema, { start_date: '2025-07-27', end_date: '2025-07-27' }),
    ).toEqual([])
    expect(issuesOf(ReportListQuerySchema, { start_date: '2025-07-28' })).toEqual([])
  })
})

describe('パスの ID', () => {
  it('正の整数のみ許可し、文字列は数値に変換する', () => {
    expect(IdParamSchema.parse({ id: '12' })).toEqual({ id: 12 })
    for (const id of ['0', '-1', '1.5', 'abc', '']) {
      expect(issuesOf(IdParamSchema, { id })).toHaveLength(1)
    }
  })
})

describe('顧客（会社名のみ必須）', () => {
  it('会社名だけで OK。メールは任意だが、あれば形式を検証する', () => {
    expect(issuesOf(CustomerCreateRequestSchema, { company_name: 'ABC商事' })).toEqual([])
    expect(issuesOf(CustomerCreateRequestSchema, { company_name: 'ABC商事', email: null })).toEqual(
      [],
    )
    expect(
      issuesOf(CustomerCreateRequestSchema, { company_name: 'ABC商事', email: 'bad' }),
    ).toEqual([['email', 'メールアドレスの形式が正しくありません']])
  })

  it('会社名は必須・200文字以内', () => {
    expect(issuesOf(CustomerCreateRequestSchema, {})).toEqual([
      ['company_name', '会社名は必須項目です'],
    ])
    expect(issuesOf(CustomerCreateRequestSchema, { company_name: 'あ'.repeat(201) })).toEqual([
      ['company_name', '会社名は200文字以内で入力してください'],
    ])
  })
})
