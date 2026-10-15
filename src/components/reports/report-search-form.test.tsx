import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DATE_ORDER_ERROR, ReportSearchForm } from '@/components/reports/report-search-form'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Radix の Select が使うブラウザ API が jsdom に無いため補う
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
})

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

  it('開始日が終了日より後のとき、エラー文は1つだけで、入力欄と検索ボタンに関連付く', () => {
    render(<ReportSearchForm initial={{ start_date: '2025-08-01', end_date: '2025-07-01' }} />)

    const alert = screen.getByRole('alert')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    for (const el of [
      screen.getByLabelText('期間（開始）'),
      screen.getByLabelText('期間（終了）'),
      screen.getByRole('button', { name: '検索' }),
    ]) {
      expect(el).toHaveAttribute('aria-describedby', alert.id)
    }
  })

  describe('管理者（営業担当の絞り込み）', () => {
    const salesPersons = [
      { id: 1, name: '山田太郎' },
      { id: 2, name: '田中花子' },
    ]

    it('担当者を選んで検索すると sales_person_id がクエリに載る', async () => {
      render(<ReportSearchForm initial={{}} salesPersons={salesPersons} />)

      await userEvent.click(screen.getByRole('combobox', { name: '営業担当' }))
      await userEvent.click(await screen.findByRole('option', { name: '田中花子' }))
      await userEvent.click(screen.getByRole('button', { name: '検索' }))

      expect(push).toHaveBeenCalledWith('/reports?sales_person_id=2')
    })

    it('条件をクリアして検索すると /reports に遷移する', async () => {
      render(
        <ReportSearchForm
          initial={{ start_date: '2025-07-01', end_date: '2025-07-31', sales_person_id: '1' }}
          salesPersons={salesPersons}
        />,
      )

      await userEvent.clear(screen.getByLabelText('期間（開始）'))
      await userEvent.clear(screen.getByLabelText('期間（終了）'))
      await userEvent.click(screen.getByRole('combobox', { name: '営業担当' }))
      await userEvent.click(await screen.findByRole('option', { name: '全員' }))
      await userEvent.click(screen.getByRole('button', { name: '検索' }))

      expect(push).toHaveBeenCalledWith('/reports')
    })

    it('一覧にない担当者 ID は「全員」として扱う', () => {
      render(<ReportSearchForm initial={{ sales_person_id: '999' }} salesPersons={salesPersons} />)

      expect(screen.getByRole('combobox', { name: '営業担当' })).toHaveTextContent('全員')
    })
  })
})
