import { render, screen } from '@testing-library/react'
import { CustomerPagination } from '@/components/customers/customer-pagination'

const pagination = (page: number, total_pages: number) => ({
  total: 45,
  page,
  per_page: 20,
  total_pages,
})

describe('CustomerPagination', () => {
  it('件数とページ位置を表示する', () => {
    render(<CustomerPagination pagination={pagination(2, 3)} />)
    expect(screen.getByText('全45件（2 / 3 ページ）')).toBeInTheDocument()
  })

  it('途中のページでは前へ・次へがリンクで、検索語を引き継ぐ', () => {
    render(<CustomerPagination pagination={pagination(2, 3)} search="ABC" />)

    expect(screen.getByRole('link', { name: '前へ' })).toHaveAttribute(
      'href',
      '/customers?search=ABC',
    )
    expect(screen.getByRole('link', { name: '次へ' })).toHaveAttribute(
      'href',
      '/customers?search=ABC&page=3',
    )
  })

  it('先頭では前へ、末尾では次へを押せない', () => {
    const { rerender } = render(<CustomerPagination pagination={pagination(1, 3)} />)
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    expect(screen.getByRole('link', { name: '次へ' })).toBeInTheDocument()

    rerender(<CustomerPagination pagination={pagination(3, 3)} />)
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
    expect(screen.getByRole('link', { name: '前へ' })).toBeInTheDocument()
  })
})
