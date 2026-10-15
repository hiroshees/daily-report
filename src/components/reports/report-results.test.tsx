import { render, screen } from '@testing-library/react'
import { ReportResults } from '@/components/reports/report-results'
import { listReports } from '@/server/services/report-list'

vi.mock('@/server/services/report-list', () => ({ listReports: vi.fn() }))

const query = { page: 1, per_page: 20 }
const props = { query, isManager: false, today: '2025-08-01', href: '/reports' }
const row = {
  id: 1,
  report_date: '2025-07-27',
  sales_person: { id: 1, name: '山田太郎' },
  visit_count: 3,
  has_comments: false,
  created_at: '2025-07-27T09:00:00.000Z',
}
const pagination = (total: number, page = 1) => ({
  total,
  page,
  per_page: 20,
  total_pages: Math.ceil(total / 20),
})

beforeEach(() => vi.resetAllMocks())

describe('ReportResults', () => {
  it('一覧とページネーションを表示する', async () => {
    vi.mocked(listReports).mockResolvedValue({ data: [row], pagination: pagination(1) })
    render(await ReportResults(props))

    expect(screen.getByText('山田太郎')).toBeInTheDocument()
    expect(screen.getByText('全1件（1 / 1 ページ）')).toBeInTheDocument()
  })

  it('0 件のときは空表示', async () => {
    vi.mocked(listReports).mockResolvedValue({ data: [], pagination: pagination(0) })
    render(await ReportResults(props))

    expect(screen.getByText('条件に一致する日報はありません。')).toBeInTheDocument()
  })

  it('範囲外のページは 1 ページ目へ戻る導線を出す（条件は引き継ぐ）', async () => {
    vi.mocked(listReports).mockResolvedValue({ data: [], pagination: pagination(5, 9) })
    render(
      await ReportResults({
        ...props,
        query: { ...query, page: 9, start_date: '2025-07-01', sales_person_id: 2 },
      }),
    )

    expect(screen.getByText('このページには日報がありません。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1ページ目へ戻る' })).toHaveAttribute(
      'href',
      '/reports?start_date=2025-07-01&sales_person_id=2',
    )
  })

  it('取得に失敗したらエラーと再読み込みリンクを表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(listReports).mockRejectedValue(new Error('db down'))
    render(await ReportResults({ ...props, href: '/reports?page=2' }))

    expect(screen.getByText('日報一覧を取得できませんでした')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '再読み込み' })).toHaveAttribute(
      'href',
      '/reports?page=2',
    )
  })
})
