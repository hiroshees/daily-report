import { render, screen } from '@testing-library/react'
import { SalesPersonResults } from '@/components/sales-persons/sales-person-results'
import { listSalesPersons } from '@/server/services/sales-person'

vi.mock('@/server/services/sales-person', () => ({ listSalesPersons: vi.fn() }))
vi.mock('@/components/sales-persons/sales-person-table', () => ({
  SalesPersonTable: (props: unknown) => <pre data-testid="table">{JSON.stringify(props)}</pre>,
}))

const list = vi.mocked(listSalesPersons)
const person = {
  id: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  is_manager: false,
}

async function renderResults(query = {}, href = '/sales-persons') {
  render(await SalesPersonResults({ query, currentUserId: 9, href }))
}

beforeEach(() => vi.resetAllMocks())

describe('SalesPersonResults', () => {
  it('取得した担当者とログインユーザーの ID を、表に渡す', async () => {
    list.mockResolvedValue({ data: [person] })
    await renderResults({ department: '営業1課' })

    expect(list).toHaveBeenCalledWith({ department: '営業1課' })
    expect(JSON.parse(screen.getByTestId('table').textContent ?? '{}')).toEqual({
      people: [person],
      currentUserId: 9,
    })
  })

  it('登録が 0 件ならその旨を表示する', async () => {
    list.mockResolvedValue({ data: [] })
    await renderResults()

    expect(screen.getByText('営業担当者が登録されていません。')).toBeInTheDocument()
  })

  it('絞り込みで 0 件なら、条件に一致しない旨を表示する', async () => {
    list.mockResolvedValue({ data: [] })
    await renderResults({ is_manager: 'true' })

    expect(screen.getByText('条件に一致する営業担当者はいません。')).toBeInTheDocument()
  })

  it('取得に失敗したらエラーと再読み込みを表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    list.mockRejectedValue(new Error('db down'))
    await renderResults({}, '/sales-persons?is_manager=true')

    expect(screen.getByText('営業担当者一覧を取得できませんでした')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '再読み込み' })).toHaveAttribute(
      'href',
      '/sales-persons?is_manager=true',
    )
  })
})
