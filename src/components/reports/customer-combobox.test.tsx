import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerCombobox } from '@/components/reports/customer-combobox'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { GET: vi.fn() } }))
const get = vi.mocked(apiClient.GET) as unknown as ReturnType<typeof vi.fn>

const customers = [
  { id: 1, company_name: 'ABC商事' },
  { id: 2, company_name: 'XYZ工業' },
]
const list = (data = customers, total = data.length) => ({
  response: new Response(null),
  data: { data, pagination: { total, page: 1, per_page: 20, total_pages: 1 } },
  error: undefined,
})

beforeEach(() => vi.resetAllMocks())

/** 親（フォーム）が選択値を保持する状況を再現する。ラベルでトリガーを特定する */
function Controlled({
  onChange = () => {},
  initial,
  selectedLabel,
}: {
  onChange?: (id: number) => void
  initial?: number
  selectedLabel?: string
}) {
  const [value, setValue] = useState<number | undefined>(initial)
  return (
    <>
      <label htmlFor="customer">顧客名</label>
      <CustomerCombobox
        id="customer"
        value={value}
        selectedLabel={selectedLabel}
        onChange={(id) => {
          setValue(id)
          onChange(id)
        }}
      />
    </>
  )
}

const trigger = () => screen.getByLabelText('顧客名')

describe('CustomerCombobox', () => {
  it('開くと顧客を検索して表示し、選択すると onChange を呼ぶ', async () => {
    get.mockResolvedValue(list())
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)

    await user.click(trigger())
    await user.click(await screen.findByRole('button', { name: 'XYZ工業' }))

    expect(onChange).toHaveBeenCalledWith(2)
    expect(trigger()).toHaveTextContent('XYZ工業')
  })

  it('未選択の間は「選択してください」を表示する', () => {
    render(<Controlled />)
    expect(trigger()).toHaveTextContent('選択してください')
  })

  it('既存の値は selectedLabel の会社名で表示する', () => {
    render(<Controlled initial={12} selectedLabel="既存商事" />)
    expect(trigger()).toHaveTextContent('既存商事')
  })

  it('会社名が分からない既存の値は ID で表示する', () => {
    render(<Controlled initial={12} />)
    expect(trigger()).toHaveTextContent('顧客ID: 12')
  })

  it('選択中の候補を aria-current で示す。listbox / option は使わない', async () => {
    get.mockResolvedValue(list())
    const user = userEvent.setup()
    render(<Controlled initial={1} selectedLabel="ABC商事" />)

    await user.click(trigger())

    expect(await screen.findByRole('button', { name: 'ABC商事' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'XYZ工業' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('FormControl が付与する aria-invalid / aria-describedby をトリガーに反映する', () => {
    render(
      <CustomerCombobox value={undefined} onChange={vi.fn()} aria-invalid aria-describedby="msg" />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-invalid', 'true')
    expect(button).toHaveAttribute('aria-describedby', 'msg')
  })

  it('入力した語句で検索する', async () => {
    get.mockResolvedValue(list())
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())
    await user.type(screen.getByLabelText('顧客を検索'), 'ABC')

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/customers', {
        params: { query: { search: 'ABC', per_page: 20 } },
      }),
    )
  })

  it('候補が表示件数を超える場合は、絞り込みを案内する', async () => {
    get.mockResolvedValue(list(customers, 57))
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())

    expect(await screen.findByText(/他 55 件あります/)).toBeInTheDocument()
  })

  it('全件表示できているときは絞り込みの案内を出さない', async () => {
    get.mockResolvedValue(list())
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())
    await screen.findByRole('button', { name: 'ABC商事' })

    expect(screen.queryByText(/件あります/)).not.toBeInTheDocument()
  })

  it('該当なしを表示する', async () => {
    get.mockResolvedValue(list([]))
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())

    expect(await screen.findByText('該当する顧客がありません')).toBeInTheDocument()
  })

  it('取得に失敗したらエラーを表示する', async () => {
    get.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客の取得に失敗しました')
  })

  it('取得に失敗したら、前の検索結果を候補に残さない', async () => {
    get.mockResolvedValueOnce(list()).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())
    expect(await screen.findByRole('button', { name: 'ABC商事' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('顧客を検索'), 'X')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ABC商事' })).not.toBeInTheDocument()
  })

  it('検索の途中で閉じても「検索中」が残らず、開き直すと検索語をリセットする', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(trigger())
    await user.type(screen.getByLabelText('顧客を検索'), 'ABC')
    await user.keyboard('{Escape}')

    get.mockResolvedValue(list([]))
    await user.click(trigger())

    expect(screen.getByLabelText('顧客を検索')).toHaveValue('')
    expect(await screen.findByText('該当する顧客がありません')).toBeInTheDocument()
    expect(screen.queryByText('検索中…')).not.toBeInTheDocument()
  })
})
