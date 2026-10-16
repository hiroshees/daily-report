import { render, screen } from '@testing-library/react'
import Page from '@/app/(app)/sales-persons/page'
import { requireManagerPage } from '@/server/page-auth'

vi.mock('@/server/page-auth', () => ({ requireManagerPage: vi.fn() }))
vi.mock('@/components/sales-persons/sales-person-results', () => ({
  SalesPersonResults: (props: unknown) => <pre data-testid="results">{JSON.stringify(props)}</pre>,
}))
vi.mock('@/components/sales-persons/sales-person-filter-section', () => ({
  SalesPersonFilterSection: (props: unknown) => (
    <pre data-testid="filter">{JSON.stringify(props)}</pre>
  ),
}))
vi.mock('@/components/sales-persons/sales-person-form-dialog', () => ({
  SalesPersonFormDialog: () => <span>新規登録ダイアログ</span>,
}))

const manager = {
  id: 2,
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
  vi.mocked(requireManagerPage).mockResolvedValue({ allowed: true, user: manager })
})

describe('営業担当者管理ページ', () => {
  it('一般ユーザーは 403 画面を表示し、一覧は表示しない', async () => {
    vi.mocked(requireManagerPage).mockResolvedValue({
      allowed: false,
      user: { ...manager, isManager: false },
    })
    await renderPage()

    expect(screen.getByText('この操作を行う権限がありません')).toBeInTheDocument()
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
    expect(screen.queryByText('新規登録ダイアログ')).not.toBeInTheDocument()
    expect(screen.queryByTestId('filter')).not.toBeInTheDocument()
  })

  it('管理者には見出し・新規登録・絞り込み・一覧を表示し、ログインユーザーの ID を渡す', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: '営業担当者管理' })).toBeInTheDocument()
    expect(screen.getByText('新規登録ダイアログ')).toBeInTheDocument()
    expect(propsOf('results')).toEqual({ query: {}, currentUserId: 2, href: '/sales-persons' })
  })

  it('現在の絞り込み条件を絞り込み部品に渡す', async () => {
    await renderPage({ department: '営業2課' })

    expect(propsOf('filter').current).toEqual({ department: '営業2課' })
  })

  it('絞り込み条件を URL から取り出して渡す。空文字は未指定として扱う', async () => {
    await renderPage({ department: '営業1課', is_manager: 'true' })
    expect(propsOf('results').query).toEqual({ department: '営業1課', is_manager: 'true' })
    expect(propsOf('results').href).toBe(
      `/sales-persons?department=${encodeURIComponent('営業1課')}&is_manager=true`,
    )
  })

  it('空文字の条件は未指定として扱う', async () => {
    await renderPage({ department: '', is_manager: '' })
    expect(propsOf('results').query).toEqual({})
  })

  it('不正な権限の条件はエラーと戻るリンクを表示し、一覧は取得しない', async () => {
    await renderPage({ is_manager: 'abc' })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '条件をクリアして一覧に戻る' })).toHaveAttribute(
      'href',
      '/sales-persons',
    )
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
  })
})
