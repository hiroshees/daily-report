import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import Page from '@/app/(app)/reports/page'
import { requirePageUser } from '@/server/page-auth'

vi.mock('@/server/page-auth', () => ({ requirePageUser: vi.fn() }))
// 非同期の子コンポーネントは、受け取った props だけを確認する
vi.mock('@/components/reports/report-results', () => ({
  ReportResults: (props: unknown) => <pre data-testid="results">{JSON.stringify(props)}</pre>,
}))
vi.mock('@/components/reports/report-search-section', () => ({
  ReportSearchSection: (props: unknown) => <pre data-testid="search">{JSON.stringify(props)}</pre>,
}))
vi.mock('@/components/reports/new-report-button', () => ({
  NewReportButton: () => <span>新規日報作成</span>,
}))

const member = {
  id: 1,
  name: '山田太郎',
  email: 'y@example.com',
  department: '営業1課',
  isManager: false,
}
const manager = { ...member, id: 2, isManager: true }

async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  const element: ReactNode = await Page({ searchParams: Promise.resolve(searchParams) })
  render(element)
}
const propsOf = (testId: string) => JSON.parse(screen.getByTestId(testId).textContent ?? '{}')

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requirePageUser).mockResolvedValue(member)
})

describe('日報一覧ページ', () => {
  it('空文字のパラメータは未指定として扱う', async () => {
    await renderPage({ start_date: '', end_date: '', sales_person_id: '', page: '' })

    expect(propsOf('results').query).toEqual({ page: 1, per_page: 20 })
    expect(propsOf('results').href).toBe('/reports')
  })

  it('不正なパラメータはエラーを表示し、一覧は取得しない', async () => {
    await renderPage({ page: 'abc' })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
  })

  it('開始日 > 終了日は、ページ側ではエラーを重ねて表示しない（フォームが表示する）', async () => {
    await renderPage({ start_date: '2025-08-01', end_date: '2025-07-01' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('results')).not.toBeInTheDocument()
  })

  it('一般ユーザーの sales_person_id は（不正値でも）無視する', async () => {
    await renderPage({ sales_person_id: 'abc' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(propsOf('results').query.sales_person_id).toBeUndefined()
    expect(propsOf('results').href).toBe('/reports')
    expect(propsOf('search').isManager).toBe(false)
    expect(propsOf('search').initial.sales_person_id).toBeUndefined()
  })

  it('管理者の sales_person_id は検索条件に反映する', async () => {
    vi.mocked(requirePageUser).mockResolvedValue(manager)
    await renderPage({ sales_person_id: '3', page: '2' })

    expect(propsOf('results').query.sales_person_id).toBe(3)
    expect(propsOf('results').href).toBe('/reports?sales_person_id=3&page=2')
    expect(propsOf('search').isManager).toBe(true)
  })
})
