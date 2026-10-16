import { render, screen } from '@testing-library/react'
import Page from '@/app/(app)/reports/[id]/page'
import { ApiError } from '@/server/errors'
import { requirePageUser } from '@/server/page-auth'
import { getReport } from '@/server/services/report'

vi.mock('@/server/page-auth', () => ({ requirePageUser: vi.fn() }))
vi.mock('@/server/services/report', () => ({ getReport: vi.fn() }))
vi.mock('@/components/reports/report-detail', () => ({
  ReportDetailView: (props: unknown) => <pre data-testid="view">{JSON.stringify(props)}</pre>,
}))
const notFound = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ notFound }))

const user = {
  id: 1,
  name: '山田太郎',
  email: 'y@example.com',
  department: '営業1課',
  isManager: false,
}
const report = { id: 42, report_date: '2025-07-27' }

async function renderPage(id = '42', search: Record<string, string | string[]> = {}) {
  render(await Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) }))
}
const viewProps = () => JSON.parse(screen.getByTestId('view').textContent ?? '{}')

beforeEach(() => {
  vi.resetAllMocks()
  notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND')
  })
  vi.mocked(requirePageUser).mockResolvedValue(user)
  vi.mocked(getReport).mockResolvedValue(report as Awaited<ReturnType<typeof getReport>>)
})

describe('日報詳細ページ', () => {
  it('日報とログインユーザーを渡して表示する。他人の日報も閲覧できる', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({ ...user, id: 9 })
    await renderPage()

    expect(getReport).toHaveBeenCalledWith(42)
    expect(viewProps()).toMatchObject({ report, user: { id: 9 }, backHref: '/reports' })
  })

  it('back の検索条件つき一覧 URL を「戻る」先にする。不正な値は既定の一覧', async () => {
    await renderPage('42', { back: '/reports?page=2' })
    expect(viewProps().backHref).toBe('/reports?page=2')
  })

  it('外部 URL の back は無視する', async () => {
    await renderPage('42', { back: 'https://evil.example.com' })
    expect(viewProps().backHref).toBe('/reports')
  })

  it('存在しない ID は 404 にする', async () => {
    vi.mocked(getReport).mockRejectedValue(new ApiError('NOT_FOUND'))

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('ID が数値でない場合は 404 にする（日報は取得しない）', async () => {
    await expect(renderPage('abc')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getReport).not.toHaveBeenCalled()
  })

  it('想定外のエラーは握りつぶさず再 throw する', async () => {
    vi.mocked(getReport).mockRejectedValue(new Error('db down'))

    await expect(renderPage()).rejects.toThrow('db down')
    expect(notFound).not.toHaveBeenCalled()
  })
})
