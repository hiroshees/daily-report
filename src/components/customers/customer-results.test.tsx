import { render, screen } from '@testing-library/react'
import { CustomerResults } from '@/components/customers/customer-results'
import type { CustomerListQuery } from '@/schemas/customer'
import { listCustomers } from '@/server/services/customer'

vi.mock('@/server/services/customer', () => ({ listCustomers: vi.fn() }))
// 行の操作ボタン（ダイアログ）は別のテストで確認する
vi.mock('@/components/customers/customer-form-dialog', () => ({
  CustomerFormDialog: ({ customerId }: { customerId?: number }) => <span>編集:{customerId}</span>,
}))
vi.mock('@/components/customers/customer-delete-button', () => ({
  CustomerDeleteButton: ({ customerId }: { customerId: number }) => <span>削除:{customerId}</span>,
}))

const list = vi.mocked(listCustomers)
const query: CustomerListQuery = { page: 1, per_page: 20 }
const pagination = (total: number, page = 1) => ({
  total,
  page,
  per_page: 20,
  total_pages: Math.ceil(total / 20),
})
const customer = (id: number, overrides = {}) => ({
  id,
  company_name: `会社${id}`,
  contact_person: `担当${id}`,
  phone: `03-0000-000${id}`,
  email: null,
  ...overrides,
})

async function renderResults(q = query, href = '/customers') {
  render(await CustomerResults({ query: q, href }))
}

beforeEach(() => vi.resetAllMocks())

describe('CustomerResults', () => {
  it('会社名・担当者・電話と、編集・削除の操作を表示する', async () => {
    list.mockResolvedValue({
      data: [customer(1), customer(2, { contact_person: null })],
      pagination: pagination(2),
    })
    await renderResults()

    expect(screen.getByText('会社1')).toBeInTheDocument()
    expect(screen.getByText('担当1')).toBeInTheDocument()
    expect(screen.getByText('03-0000-0001')).toBeInTheDocument()
    expect(screen.getByText('編集:2')).toBeInTheDocument()
    expect(screen.getByText('削除:2')).toBeInTheDocument()
    // 担当者が未設定の行は「-」
    expect(screen.getAllByText('-')).toHaveLength(1)
  })

  it('検索語つきで一覧を取得する', async () => {
    list.mockResolvedValue({ data: [customer(1)], pagination: pagination(1) })
    await renderResults({ ...query, search: 'ABC' })

    expect(list).toHaveBeenCalledWith({ page: 1, per_page: 20, search: 'ABC' })
  })

  it('登録が 0 件ならその旨を表示する', async () => {
    list.mockResolvedValue({ data: [], pagination: pagination(0) })
    await renderResults()

    expect(screen.getByText('顧客が登録されていません。')).toBeInTheDocument()
  })

  it('検索で 0 件なら、条件に一致しない旨を表示する', async () => {
    list.mockResolvedValue({ data: [], pagination: pagination(0) })
    await renderResults({ ...query, search: 'zzz' })

    expect(screen.getByText('条件に一致する顧客はありません。')).toBeInTheDocument()
  })

  it('範囲外のページでは、検索語を保った 1 ページ目への導線を出す', async () => {
    list.mockResolvedValue({ data: [], pagination: pagination(5, 9) })
    await renderResults({ page: 9, per_page: 20, search: 'ABC' })

    expect(screen.getByRole('link', { name: '1ページ目へ戻る' })).toHaveAttribute(
      'href',
      '/customers?search=ABC',
    )
  })

  it('取得に失敗したらエラーと再読み込みを表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    list.mockRejectedValue(new Error('db down'))
    await renderResults(query, '/customers?search=ABC')

    expect(screen.getByText('顧客一覧を取得できませんでした')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '再読み込み' })).toHaveAttribute(
      'href',
      '/customers?search=ABC',
    )
  })
})
