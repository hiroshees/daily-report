import { render, screen } from '@testing-library/react'
import { ReportPagination } from '@/components/reports/report-pagination'

const pagination = (page: number) => ({ total: 50, page, per_page: 20, total_pages: 3 })

describe('ReportPagination', () => {
  it('1 ページ目は「前へ」が押せず、「次へ」は検索条件を引き継ぐ', () => {
    render(<ReportPagination pagination={pagination(1)} params={{ start_date: '2025-07-01' }} />)

    expect(screen.getByText('全50件（1 / 3 ページ）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    expect(screen.getByRole('link', { name: '次へ' })).toHaveAttribute(
      'href',
      '/reports?start_date=2025-07-01&page=2',
    )
  })

  it('途中のページは前後へ移動できる（1 ページ目への戻りは page を省略）', () => {
    const { rerender } = render(<ReportPagination pagination={pagination(2)} params={{}} />)
    expect(screen.getByRole('link', { name: '前へ' })).toHaveAttribute('href', '/reports')
    expect(screen.getByRole('link', { name: '次へ' })).toHaveAttribute('href', '/reports?page=3')

    rerender(<ReportPagination pagination={pagination(3)} params={{}} />)
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })
})
