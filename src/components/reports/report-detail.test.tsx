import { render, screen, within } from '@testing-library/react'
import { ReportDetailView } from '@/components/reports/report-detail'

vi.mock('@/components/reports/comment-form', () => ({
  CommentForm: ({ reportId }: { reportId: number }) => <div>コメントフォーム:{reportId}</div>,
}))

const report = {
  id: 42,
  report_date: '2025-07-27',
  sales_person: { id: 1, name: '山田太郎', email: 'y@example.com' },
  problem: '新規開拓が遅れている\n競合の動向を調べたい',
  plan: 'ABC商事への見積もり作成',
  visits: [
    {
      id: 11,
      customer: { id: 3, company_name: 'ABC商事' },
      visit_time: '10:00',
      visit_content: '新商品の提案を実施。\n次回見積もり提出予定。',
    },
    {
      id: 12,
      customer: { id: 4, company_name: 'XYZ工業' },
      visit_time: null,
      visit_content: '保守相談',
    },
  ],
  comments: [
    {
      id: 1,
      manager: { id: 2, name: '田中部長' },
      comment: '明日相談しましょう。',
      created_at: '2025-07-27T09:00:00Z',
    },
    {
      id: 2,
      manager: { id: 2, name: '田中部長' },
      comment: '追加の確認です。',
      created_at: '2025-07-27T10:30:00Z',
    },
  ],
  created_at: '2025-07-27T08:00:00Z',
  updated_at: '2025-07-27T08:00:00Z',
}

const owner = { id: 1, isManager: false }
const manager = { id: 2, isManager: true }

function renderView(overrides: Partial<Parameters<typeof ReportDetailView>[0]> = {}) {
  render(<ReportDetailView report={report} user={owner} backHref="/reports" {...overrides} />)
}

describe('ReportDetailView（SC005）', () => {
  it('日付・作成者・訪問記録・課題・計画を表示する', () => {
    renderView()

    expect(screen.getByText('2025/07/27')).toBeInTheDocument()
    expect(screen.getByText('山田太郎')).toBeInTheDocument()
    expect(screen.getByText('1. ABC商事（10:00）')).toBeInTheDocument()
    expect(screen.getByText(/新商品の提案を実施/)).toBeInTheDocument()
    expect(screen.getByText(/新規開拓が遅れている/)).toBeInTheDocument()
    expect(screen.getByText('ABC商事への見積もり作成')).toBeInTheDocument()
  })

  it('訪問時刻が未入力の訪問記録は、時刻（括弧）を表示しない', () => {
    renderView()
    expect(screen.getByText('2. XYZ工業')).toBeInTheDocument()
  })

  it('訪問記録が 0 件ならその旨を表示する', () => {
    renderView({ report: { ...report, visits: [] } })
    expect(screen.getByText('訪問記録はありません')).toBeInTheDocument()
  })

  it('改行を保持して表示する（whitespace-pre-wrap）', () => {
    renderView()
    expect(screen.getByText(/新規開拓が遅れている/)).toHaveClass('whitespace-pre-wrap')
    expect(screen.getByText(/新商品の提案を実施/)).toHaveClass('whitespace-pre-wrap')
  })

  it('TC-SEC-002: ユーザー入力は HTML として解釈せず、そのまま文字として表示する', () => {
    const xss = '<script>window.__xss = 1</script><img src=x onerror="window.__xss = 2">'
    const { container } = render(
      <ReportDetailView
        report={{
          ...report,
          problem: xss,
          plan: xss,
          visits: [{ ...report.visits[0]!, visit_content: xss }],
          comments: [{ ...report.comments[0]!, comment: xss }],
        }}
        user={owner}
        backHref="/reports"
      />,
    )

    expect(screen.getAllByText(xss)).toHaveLength(4)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined()
  })

  it('コメントを時系列で、日本時間の日時つきで表示する', () => {
    renderView()

    const items = within(screen.getByRole('list', { name: '上長コメント一覧' })).getAllByRole(
      'listitem',
    )
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('田中部長（7/27 18:00）：')
    expect(items[0]).toHaveTextContent('明日相談しましょう。')
    expect(items[1]).toHaveTextContent('田中部長（7/27 19:30）：')
  })

  it('コメントが無ければその旨を表示する', () => {
    renderView({ report: { ...report, comments: [] } })
    expect(screen.getByText('コメントはまだありません')).toBeInTheDocument()
  })

  it('作成者本人には [編集] を表示し、一覧の検索条件を引き継ぐ', () => {
    renderView({ backHref: '/reports?page=2' })

    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/reports/42/edit?back=%2Freports%3Fpage%3D2',
    )
  })

  it('作成者以外には [編集] を表示しない。管理者も同様', () => {
    renderView({ user: { id: 3, isManager: false } })
    expect(screen.queryByRole('link', { name: '編集' })).not.toBeInTheDocument()
  })

  it('管理者が他人の日報を見るときも [編集] は表示しない', () => {
    renderView({ user: manager })
    expect(screen.queryByRole('link', { name: '編集' })).not.toBeInTheDocument()
  })

  it('一般ユーザーにはコメント入力欄を表示しない', () => {
    renderView()
    expect(screen.queryByText(/コメントフォーム/)).not.toBeInTheDocument()
  })

  it('管理者にはコメント入力欄を表示する', () => {
    renderView({ user: manager })
    expect(screen.getByText('コメントフォーム:42')).toBeInTheDocument()
  })

  it('[戻る] は検索条件つきの一覧へ戻る', () => {
    renderView({ backHref: '/reports?start_date=2025-07-01' })

    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      '/reports?start_date=2025-07-01',
    )
  })
})
