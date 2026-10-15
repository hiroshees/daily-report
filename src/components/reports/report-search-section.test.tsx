import { render, screen } from '@testing-library/react'
import { ReportSearchSection } from '@/components/reports/report-search-section'
import { listSalesPersons } from '@/server/services/sales-person'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/server/services/sales-person', () => ({ listSalesPersons: vi.fn() }))

beforeEach(() => vi.resetAllMocks())

describe('ReportSearchSection', () => {
  it('管理者には営業担当を表示する', async () => {
    vi.mocked(listSalesPersons).mockResolvedValue({
      data: [
        {
          id: 1,
          name: '山田太郎',
          email: 'y@example.com',
          department: '営業1課',
          is_manager: false,
        },
      ],
    })
    render(await ReportSearchSection({ initial: {}, isManager: true }))

    expect(screen.getByText('営業担当')).toBeInTheDocument()
  })

  it('一般ユーザーは担当者を取得せず、営業担当も表示しない', async () => {
    render(await ReportSearchSection({ initial: {}, isManager: false }))

    expect(listSalesPersons).not.toHaveBeenCalled()
    expect(screen.queryByText('営業担当')).not.toBeInTheDocument()
  })

  it('担当者の取得に失敗しても、営業担当なしでフォームを表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(listSalesPersons).mockRejectedValue(new Error('db down'))
    render(await ReportSearchSection({ initial: {}, isManager: true }))

    expect(screen.queryByText('営業担当')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument()
  })
})
