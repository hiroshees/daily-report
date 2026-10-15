import { render, screen, within } from '@testing-library/react'
import { ReportTable } from '@/components/reports/report-table'

const reports = [
  {
    id: 10,
    report_date: '2025-07-27',
    sales_person: { id: 1, name: '山田太郎' },
    visit_count: 3,
    has_comments: true,
  },
  {
    id: 11,
    report_date: '2024-12-31',
    sales_person: { id: 2, name: '田中花子' },
    visit_count: 0,
    has_comments: false,
  },
]

describe('ReportTable', () => {
  it('日付（M/d、年またぎは年付き）・担当・顧客数・状態・詳細リンクを表示する', () => {
    render(<ReportTable reports={reports} today="2025-08-01" />)

    const [first, second] = screen.getAllByRole('row').slice(1) as [HTMLElement, HTMLElement]
    expect(within(first).getByText('7/27')).toBeInTheDocument()
    expect(within(first).getByText('山田太郎')).toBeInTheDocument()
    expect(within(first).getByText('3件')).toBeInTheDocument()
    expect(within(first).getByText('コメントあり')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: /詳細/ })).toHaveAttribute('href', '/reports/10')

    expect(within(second).getByText('2024/12/31')).toBeInTheDocument()
    expect(within(second).getByText('コメントなし')).toBeInTheDocument()
  })
})
