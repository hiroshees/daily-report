import { render, screen } from '@testing-library/react'
import Page from '@/app/(app)/customers/page'
import { requireManagerPage } from '@/server/page-auth'

vi.mock('@/server/page-auth', () => ({ requireManagerPage: vi.fn() }))
vi.mock('@/components/customers/customer-results', () => ({
  CustomerResults: (props: unknown) => <pre data-testid="results">{JSON.stringify(props)}</pre>,
}))
vi.mock('@/components/customers/customer-search-form', () => ({
  CustomerSearchForm: (props: unknown) => <pre data-testid="search">{JSON.stringify(props)}</pre>,
}))
vi.mock('@/components/customers/customer-form-dialog', () => ({
  CustomerFormDialog: () => <span>新規登録ダイアログ</span>,
}))

const user = {
  id: 1,
  name: '田中部長',
  email: 't@example.com',
  department: '営業1課',
  isManager: true,
}

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  render(await Page({ searchParams: Promise.resolve(searchParams) }))
}
const propsOf = (testId: string) => JSON.parse(screen.getByTestId(testId).textContent ?? '{}')

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireManagerPage).mockResolvedValue({ allowed: true, user })
})

describe('顧客マスタ管理ページ', () => {
  it('一般ユーザーは 403 画面を表示し、一覧を取得しない', async () => {
    vi.mocked(requireManagerPage).mockResolvedValue({
      allowed: false,
      user: { ...user, isManager: false },
    })
    await renderPage()

    expect(screen.getByText('この操作を行う権限がありません')).toBeInTheDocument()
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
    expect(screen.queryByText('新規登録ダイアログ')).not.toBeInTheDocument()
  })

  it('管理者には見出し・新規登録・検索・一覧を表示する', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: '顧客マスタ管理' })).toBeInTheDocument()
    expect(screen.getByText('新規登録ダイアログ')).toBeInTheDocument()
    expect(propsOf('results')).toEqual({ query: { page: 1, per_page: 20 }, href: '/customers' })
  })

  it('検索語とページを URL から取り出して渡す。空白は除く', async () => {
    await renderPage({ search: ' ABC ', page: '2' })

    expect(propsOf('results').query).toEqual({ search: 'ABC', page: 2, per_page: 20 })
    expect(propsOf('results').href).toBe('/customers?search=ABC&page=2')
    expect(propsOf('search').initial).toBe('ABC')
  })

  it('空文字の検索語は未指定として扱う', async () => {
    await renderPage({ search: '', page: '' })
    expect(propsOf('results').query).toEqual({ page: 1, per_page: 20 })
  })

  it('不正なページはエラーを表示し、一覧は取得しない', async () => {
    await renderPage({ page: 'abc' })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
  })
})
