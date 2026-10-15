import { render, screen } from '@testing-library/react'
import { NewReportButton } from '@/components/reports/new-report-button'
import { findReportIdByDate } from '@/server/services/report-list'

vi.mock('@/server/services/report-list', () => ({ findReportIdByDate: vi.fn() }))

beforeEach(() => vi.resetAllMocks())

describe('NewReportButton', () => {
  it('本日分が未作成なら作成画面へ', async () => {
    vi.mocked(findReportIdByDate).mockResolvedValue(null)
    render(await NewReportButton({ userId: 1, today: '2025-08-01' }))

    expect(screen.getByRole('link', { name: '新規日報作成' })).toHaveAttribute(
      'href',
      '/reports/new',
    )
  })

  it('本日分が作成済みなら既存の日報へ誘導する', async () => {
    vi.mocked(findReportIdByDate).mockResolvedValue(42)
    render(await NewReportButton({ userId: 1, today: '2025-08-01' }))

    expect(screen.getByRole('link', { name: '本日の日報を開く' })).toHaveAttribute(
      'href',
      '/reports/42',
    )
  })

  it('確認に失敗したら作成画面へフォールバックする', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(findReportIdByDate).mockRejectedValue(new Error('db down'))
    render(await NewReportButton({ userId: 1, today: '2025-08-01' }))

    expect(screen.getByRole('link', { name: '新規日報作成' })).toHaveAttribute(
      'href',
      '/reports/new',
    )
  })
})
