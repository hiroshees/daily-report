import { render, screen } from '@testing-library/react'
import Page from '@/app/(app)/reports/[id]/edit/page'
import { ApiError } from '@/server/errors'
import { requirePageUser } from '@/server/page-auth'
import { getReport } from '@/server/services/report'

vi.mock('@/server/page-auth', () => ({ requirePageUser: vi.fn() }))
vi.mock('@/server/services/report', () => ({ getReport: vi.fn() }))
// フォーム本体は report-form.test で確認する。ここでは渡された props だけを見る
vi.mock('@/components/reports/report-form', () => ({
  ReportForm: (props: unknown) => <pre data-testid="form">{JSON.stringify(props)}</pre>,
}))
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
)
vi.mock('next/navigation', () => ({ notFound }))

const owner = {
  id: 1,
  name: '山田太郎',
  email: 'y@example.com',
  department: '営業1課',
  isManager: false,
}

const report = {
  id: 42,
  report_date: '2025-07-20',
  sales_person: { id: 1, name: '山田太郎', email: 'y@example.com' },
  problem: '課題',
  plan: '計画',
  visits: [
    {
      id: 11,
      customer: { id: 3, company_name: 'ABC商事' },
      visit_time: '10:00',
      visit_content: '提案',
    },
    {
      id: 12,
      customer: { id: 4, company_name: 'XYZ工業' },
      visit_time: null,
      visit_content: '相談',
    },
  ],
  comments: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

async function renderPage(id = '42') {
  render(await Page({ params: Promise.resolve({ id }) }))
}
const formProps = () => JSON.parse(screen.getByTestId('form').textContent ?? '{}')

beforeEach(() => {
  vi.resetAllMocks()
  notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND')
  })
  vi.mocked(requirePageUser).mockResolvedValue(owner)
  vi.mocked(getReport).mockResolvedValue(report)
})

describe('日報編集ページ', () => {
  it('作成者本人には、既存の内容を初期値としてフォームを表示する', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: '日報編集' })).toBeInTheDocument()
    expect(formProps()).toEqual({
      mode: 'edit',
      reportId: 42,
      reportDate: '2025-07-20',
      authorName: '山田太郎',
      initialValues: {
        problem: '課題',
        plan: '計画',
        visits: [
          { visit_id: 11, customer_id: 3, visit_time: '10:00', visit_content: '提案' },
          { visit_id: 12, customer_id: 4, visit_time: '', visit_content: '相談' },
        ],
      },
      customerLabels: { 3: 'ABC商事', 4: 'XYZ工業' },
    })
  })

  it('他人の日報は 403 画面を表示し、フォームを出さない', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({ ...owner, id: 2 })
    await renderPage()

    expect(screen.getByText('この操作を行う権限がありません')).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('管理者も他人の日報は編集できない', async () => {
    vi.mocked(requirePageUser).mockResolvedValue({ ...owner, id: 2, isManager: true })
    await renderPage()

    expect(screen.getByText('この操作を行う権限がありません')).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('編集期限を過ぎた日報は、編集不可のメッセージと詳細への導線を表示する', async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(getReport).mockResolvedValue({ ...report, created_at: old })
    await renderPage()

    expect(screen.getByText('編集可能な期間を過ぎています')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '日報詳細へ戻る' })).toHaveAttribute(
      'href',
      '/reports/42',
    )
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('存在しない ID は 404 にする', async () => {
    vi.mocked(getReport).mockRejectedValue(new ApiError('NOT_FOUND'))

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
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
