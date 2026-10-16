import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerForm } from '@/components/customers/customer-form'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn(), PUT: vi.fn() } }))
vi.mock('@/components/ui/dialog', () => ({
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>
const put = vi.mocked(apiClient.PUT) as unknown as ReturnType<typeof vi.fn>

const ok = () => ({
  response: new Response(null, { status: 201 }),
  data: { id: 1 },
  error: undefined,
})
const failure = (status: number, error: unknown) => ({
  response: new Response(null, { status }),
  data: undefined,
  error,
})

const save = () => screen.getByRole('button', { name: /^保存/ })

function setup(props: Partial<React.ComponentProps<typeof CustomerForm>> = {}) {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(<CustomerForm onSaved={onSaved} onCancel={onCancel} {...props} />)
  return { user, onSaved, onCancel }
}

beforeEach(() => vi.resetAllMocks())

describe('CustomerForm', () => {
  it('会社名が未入力の間は保存できない', () => {
    setup()
    expect(save()).toBeDisabled()
  })

  it('会社名だけで登録でき、未入力の任意項目は null で送る', async () => {
    post.mockResolvedValue(ok())
    const { user, onSaved } = setup()

    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith('/customers', {
      body: {
        company_name: 'ABC商事',
        contact_person: null,
        phone: null,
        email: null,
        address: null,
      },
    })
  })

  it('全項目を入力して登録できる', async () => {
    post.mockResolvedValue(ok())
    const { user } = setup()

    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await user.type(screen.getByLabelText('担当者名'), '佐藤一郎')
    await user.type(screen.getByLabelText('電話番号'), '03-1234-5678')
    await user.type(screen.getByLabelText('メールアドレス'), 'sato@abc.co.jp')
    await user.type(screen.getByLabelText('住所'), '東京都千代田区')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0]![1].body).toEqual({
      company_name: 'ABC商事',
      contact_person: '佐藤一郎',
      phone: '03-1234-5678',
      email: 'sato@abc.co.jp',
      address: '東京都千代田区',
    })
  })

  it('メールアドレスの形式エラーを表示し、保存できない', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await user.type(screen.getByLabelText('メールアドレス'), 'abc')

    expect(await screen.findByText('メールアドレスの形式が正しくありません')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('編集では既存の値を初期表示し、PUT で更新する', async () => {
    put.mockResolvedValue({ ...ok(), response: new Response(null, { status: 200 }) })
    const { user, onSaved } = setup({
      customerId: 7,
      initialValues: {
        company_name: 'ABC商事',
        contact_person: '佐藤一郎',
        phone: '',
        email: '',
        address: '',
      },
    })

    expect(screen.getByLabelText('会社名（必須）')).toHaveValue('ABC商事')
    expect(screen.getByLabelText('担当者名')).toHaveValue('佐藤一郎')

    await user.type(screen.getByLabelText('電話番号'), '06-0000-0000')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/customers/{id}', {
      params: { path: { id: 7 } },
      body: {
        company_name: 'ABC商事',
        contact_person: '佐藤一郎',
        phone: '06-0000-0000',
        email: null,
        address: null,
      },
    })
    expect(post).not.toHaveBeenCalled()
  })

  it('400 の項目エラーは該当の入力欄に、対応できないものはフォーム全体に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [
            { field: 'email', message: 'メールアドレスの形式が正しくありません' },
            { field: 'unknown', message: '想定外のエラー' },
          ],
        },
      }),
    )
    const { user, onSaved } = setup()
    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    expect(await screen.findByText('メールアドレスの形式が正しくありません')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('想定外のエラー')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('403 などのエラーはメッセージを表示し、再度保存できる', async () => {
    post.mockResolvedValue(
      failure(403, { error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' } }),
    )
    const { user, onSaved } = setup()
    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent('この操作を行う権限がありません')
    expect(onSaved).not.toHaveBeenCalled()
    expect(save()).toBeEnabled()
  })

  it('通信エラー時は汎用メッセージを表示する', async () => {
    post.mockRejectedValue(new Error('network'))
    const { user } = setup()
    await user.type(screen.getByLabelText('会社名（必須）'), 'ABC商事')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客の保存に失敗しました')
  })

  it('キャンセルで onCancel を呼ぶ', async () => {
    const { user, onCancel } = setup()
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
