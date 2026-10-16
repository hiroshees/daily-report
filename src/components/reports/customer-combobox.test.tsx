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
const list = (data = customers) => ({
  response: new Response(null),
  data: { data },
  error: undefined,
})

beforeEach(() => vi.resetAllMocks())

/** 親（フォーム）が選択値を保持する状況を再現する */
function Controlled({ onChange }: { onChange: (id: number) => void }) {
  const [value, setValue] = useState<number | undefined>()
  return (
    <CustomerCombobox
      value={value}
      onChange={(id) => {
        setValue(id)
        onChange(id)
      }}
    />
  )
}

describe('CustomerCombobox', () => {
  it('開くと顧客を検索して表示し、選択すると onChange を呼ぶ', async () => {
    get.mockResolvedValue(list())
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('button', { name: 'XYZ工業' }))

    expect(onChange).toHaveBeenCalledWith(2)
    expect(screen.getByRole('combobox')).toHaveTextContent('XYZ工業')
  })

  it('入力した語句で検索する', async () => {
    get.mockResolvedValue(list())
    const user = userEvent.setup()
    render(<CustomerCombobox value={undefined} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('顧客を検索'), 'ABC')

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/customers', {
        params: { query: { search: 'ABC', per_page: 20 } },
      }),
    )
  })

  it('該当なしを表示する', async () => {
    get.mockResolvedValue(list([]))
    const user = userEvent.setup()
    render(<CustomerCombobox value={undefined} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))

    expect(await screen.findByText('該当する顧客がありません')).toBeInTheDocument()
  })

  it('取得に失敗したらエラーを表示する', async () => {
    get.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<CustomerCombobox value={undefined} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客の取得に失敗しました')
  })

  it('取得に失敗したら、前の検索結果を候補に残さない', async () => {
    get.mockResolvedValueOnce(list()).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<CustomerCombobox value={undefined} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('button', { name: 'ABC商事' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('顧客を検索'), 'X')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ABC商事' })).not.toBeInTheDocument()
  })

  it('検索の途中で閉じても「検索中」が残らず、開き直すと検索語をリセットする', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<CustomerCombobox value={undefined} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByLabelText('顧客を検索'), 'ABC')
    await user.keyboard('{Escape}')

    get.mockResolvedValue(list([]))
    await user.click(screen.getByRole('combobox'))

    expect(screen.getByLabelText('顧客を検索')).toHaveValue('')
    expect(await screen.findByText('該当する顧客がありません')).toBeInTheDocument()
    expect(screen.queryByText('検索中…')).not.toBeInTheDocument()
  })
})
