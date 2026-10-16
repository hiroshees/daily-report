import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

const router = { refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(apiClient.GET) as unknown as ReturnType<typeof vi.fn>
const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>
const put = vi.mocked(apiClient.PUT) as unknown as ReturnType<typeof vi.fn>

const detail = {
  id: 7,
  company_name: 'ABC商事',
  contact_person: '佐藤一郎',
  phone: null,
  email: null,
  address: '東京都千代田区',
  created_at: '2025-07-01T00:00:00Z',
  updated_at: '2025-07-01T00:00:00Z',
}
const ok = (data: unknown = {}) => ({
  response: new Response(null, { status: 200 }),
  data,
  error: undefined,
})
const failed = () => ({ response: new Response(null, { status: 500 }), data: undefined, error: {} })

beforeEach(() => vi.resetAllMocks())

describe('CustomerFormDialog（登録）', () => {
  it('[新規登録] で開き、登録すると閉じてトーストを出し、一覧を再取得する', async () => {
    post.mockResolvedValue(ok({ id: 1 }))
    const user = userEvent.setup()
    render(<CustomerFormDialog trigger={<Button>新規登録</Button>} />)

    await user.click(screen.getByRole('button', { name: '新規登録' }))
    expect(screen.getByRole('dialog', { name: '顧客の新規登録' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('顧客を登録しました')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('キャンセルで閉じ、開き直すと入力内容がリセットされる', async () => {
    const user = userEvent.setup()
    render(<CustomerFormDialog trigger={<Button>新規登録</Button>} />)

    await user.click(screen.getByRole('button', { name: '新規登録' }))
    await user.type(screen.getByLabelText('会社名（必須）'), '途中の入力')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新規登録' }))
    expect(screen.getByLabelText('会社名（必須）')).toHaveValue('')
    expect(post).not.toHaveBeenCalled()
  })
})

describe('CustomerFormDialog（編集）', () => {
  const trigger = <Button>編集</Button>

  it('開くと最新の顧客情報（住所を含む）を取得して初期表示する', async () => {
    get.mockResolvedValue(ok(detail))
    const user = userEvent.setup()
    render(<CustomerFormDialog customerId={7} trigger={trigger} />)

    await user.click(screen.getByRole('button', { name: '編集' }))

    expect(await screen.findByLabelText('会社名（必須）')).toHaveValue('ABC商事')
    expect(screen.getByLabelText('住所')).toHaveValue('東京都千代田区')
    expect(screen.getByLabelText('電話番号')).toHaveValue('')
    expect(get).toHaveBeenCalledWith('/customers/{id}', { params: { path: { id: 7 } } })
  })

  it('更新すると閉じてトーストを出し、一覧を再取得する', async () => {
    get.mockResolvedValue(ok(detail))
    put.mockResolvedValue(ok({ id: 7 }))
    const user = userEvent.setup()
    render(<CustomerFormDialog customerId={7} trigger={trigger} />)

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(await screen.findByLabelText('電話番号'), '03-0000-0000')
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('顧客を更新しました')
    expect(put.mock.calls[0]![1].body.phone).toBe('03-0000-0000')
  })

  it('取得で 404（削除済み）なら、通知してダイアログを閉じ、一覧を再取得する', async () => {
    get.mockResolvedValue({
      response: new Response(null, { status: 404 }),
      data: undefined,
      error: { error: { code: 'NOT_FOUND', message: 'リソースが見つかりません' } },
    })
    const user = userEvent.setup()
    render(<CustomerFormDialog customerId={7} trigger={trigger} />)

    await user.click(screen.getByRole('button', { name: '編集' }))

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('この顧客は存在しません'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('取得に失敗したらエラーと再読み込みを表示し、再読み込みで取得し直す', async () => {
    get.mockResolvedValueOnce(failed()).mockResolvedValueOnce(ok(detail))
    const user = userEvent.setup()
    render(<CustomerFormDialog customerId={7} trigger={trigger} />)

    await user.click(screen.getByRole('button', { name: '編集' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('顧客情報を取得できませんでした')

    await user.click(screen.getByRole('button', { name: '再読み込み' }))
    expect(await screen.findByLabelText('会社名（必須）')).toHaveValue('ABC商事')
    expect(get).toHaveBeenCalledTimes(2)
  })
})
