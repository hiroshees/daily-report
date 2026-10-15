import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DATE_ORDER_ERROR, ReportSearchForm } from '@/components/reports/report-search-form'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => push.mockReset())

describe('ReportSearchForm', () => {
  it('営業担当は選択肢を渡したとき（管理者）だけ表示する', () => {
    const { rerender } = render(<ReportSearchForm initial={{}} />)
    expect(screen.queryByText('営業担当')).not.toBeInTheDocument()

    rerender(<ReportSearchForm initial={{}} salesPersons={[{ id: 1, name: '山田太郎' }]} />)
    expect(screen.getByText('営業担当')).toBeInTheDocument()
  })

  it('URL の検索条件を初期値として表示する', () => {
    render(<ReportSearchForm initial={{ start_date: '2025-07-01', end_date: '2025-07-31' }} />)

    expect(screen.getByLabelText('期間（開始）')).toHaveValue('2025-07-01')
    expect(screen.getByLabelText('期間（終了）')).toHaveValue('2025-07-31')
  })

  it('検索すると条件を URL クエリにして遷移する（1 ページ目）', async () => {
    render(<ReportSearchForm initial={{}} />)

    await userEvent.type(screen.getByLabelText('期間（開始）'), '2025-07-01')
    await userEvent.type(screen.getByLabelText('期間（終了）'), '2025-07-31')
    await userEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(push).toHaveBeenCalledWith('/reports?start_date=2025-07-01&end_date=2025-07-31')
  })

  it('開始日が終了日より後ならエラーを表示し、検索できない', async () => {
    render(<ReportSearchForm initial={{ start_date: '2025-08-01', end_date: '2025-07-01' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent(DATE_ORDER_ERROR)
    expect(screen.getByRole('button', { name: '検索' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(push).not.toHaveBeenCalled()
  })
})
