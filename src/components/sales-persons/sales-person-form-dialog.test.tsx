import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { SalesPersonFormDialog } from '@/components/sales-persons/sales-person-form-dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

const router = { refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn(), PUT: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>
const put = vi.mocked(apiClient.PUT) as unknown as ReturnType<typeof vi.fn>

const person = {
  id: 7,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  is_manager: false,
}
const ok = (status: number) => ({
  response: new Response(null, { status }),
  data: {},
  error: undefined,
})
const save = () => screen.getByRole('button', { name: '保存' })

beforeEach(() => vi.resetAllMocks())

describe('SalesPersonFormDialog', () => {
  it('[新規登録] で開き、登録すると閉じてトーストを出し、一覧を再取得する', async () => {
    post.mockResolvedValue(ok(201))
    const user = userEvent.setup()
    render(<SalesPersonFormDialog trigger={<Button>新規登録</Button>} />)

    await user.click(screen.getByRole('button', { name: '新規登録' }))
    expect(screen.getByRole('dialog', { name: '営業担当者の新規登録' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('氏名'), '新人太郎')
    await user.type(screen.getByLabelText('メールアドレス'), 'new@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'Test1234!')
    await user.type(screen.getByLabelText('部署'), '営業2課')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('営業担当者を登録しました')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('キャンセルで閉じ、開き直すと入力内容がリセットされる', async () => {
    const user = userEvent.setup()
    render(<SalesPersonFormDialog trigger={<Button>新規登録</Button>} />)

    await user.click(screen.getByRole('button', { name: '新規登録' }))
    await user.type(screen.getByLabelText('氏名'), '途中の入力')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    await user.click(screen.getByRole('button', { name: '新規登録' }))

    expect(screen.getByLabelText('氏名')).toHaveValue('')
    expect(post).not.toHaveBeenCalled()
  })

  it('編集は一覧の行の値を初期表示し、更新するとトーストを出して一覧を再取得する', async () => {
    put.mockResolvedValue(ok(200))
    const user = userEvent.setup()
    render(<SalesPersonFormDialog person={person} trigger={<Button>編集</Button>} />)

    await user.click(screen.getByRole('button', { name: '編集' }))
    expect(screen.getByRole('dialog', { name: '営業担当者の編集' })).toBeInTheDocument()
    expect(screen.getByLabelText('氏名')).toHaveValue('山田太郎')

    await user.type(screen.getByLabelText('氏名'), 'A')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('営業担当者を更新しました')
  })

  it('編集中に対象が削除済み(404)なら、通知して閉じ、一覧を再取得する', async () => {
    put.mockResolvedValue({
      response: new Response(null, { status: 404 }),
      data: undefined,
      error: { error: { code: 'NOT_FOUND', message: 'なし' } },
    })
    const user = userEvent.setup()
    render(<SalesPersonFormDialog person={person} trigger={<Button>編集</Button>} />)

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(screen.getByLabelText('氏名'), 'A')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('この営業担当者は存在しません'),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
