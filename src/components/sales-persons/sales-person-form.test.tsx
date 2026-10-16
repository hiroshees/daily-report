import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesPersonForm } from '@/components/sales-persons/sales-person-form'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn(), PUT: vi.fn() } }))
vi.mock('@/components/ui/dialog', () => ({
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Radix の Select が使うブラウザ API が jsdom に無いため補う
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
})

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>
const put = vi.mocked(apiClient.PUT) as unknown as ReturnType<typeof vi.fn>

const ok = (status = 201) => ({
  response: new Response(null, { status }),
  data: {},
  error: undefined,
})
const failure = (status: number, error: unknown) => ({
  response: new Response(null, { status }),
  data: undefined,
  error,
})

const person = {
  id: 7,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  is_manager: false,
}
const save = () => screen.getByRole('button', { name: /^保存/ })

function setup(props: Partial<React.ComponentProps<typeof SalesPersonForm>> = {}) {
  const handlers = { onSaved: vi.fn(), onCancel: vi.fn(), onNotFound: vi.fn() }
  const user = userEvent.setup()
  render(<SalesPersonForm {...handlers} {...props} />)
  return { user, ...handlers }
}

async function fillCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('氏名'), '新人太郎')
  await user.type(screen.getByLabelText('メールアドレス'), 'new@example.com')
  await user.type(screen.getByLabelText('パスワード'), 'Test1234!')
  await user.type(screen.getByLabelText('部署'), '営業2課')
  await waitFor(() => expect(save()).toBeEnabled())
}

beforeEach(() => vi.resetAllMocks())

describe('SalesPersonForm（登録）', () => {
  it('未入力の間は保存できない。パスワードはマスク表示', () => {
    setup()
    expect(save()).toBeDisabled()
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password')
  })

  it('入力して登録すると、一般権限で POST する', async () => {
    post.mockResolvedValue(ok())
    const { user, onSaved } = setup()
    await fillCreate(user)
    await user.click(save())

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith('/sales-persons', {
      body: {
        name: '新人太郎',
        email: 'new@example.com',
        password: 'Test1234!',
        department: '営業2課',
        is_manager: false,
      },
    })
  })

  it('パスワードが 8 文字未満ならエラーを表示し、保存できない', async () => {
    const { user } = setup()
    await fillCreate(user)
    await user.clear(screen.getByLabelText('パスワード'))
    await user.type(screen.getByLabelText('パスワード'), '1234567')

    expect(await screen.findByText('パスワードは8文字以上で入力してください')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('権限を管理者にして登録できる', async () => {
    post.mockResolvedValue(ok())
    const { user } = setup()
    await fillCreate(user)
    await user.click(screen.getByRole('combobox', { name: '権限' }))
    await user.click(await screen.findByRole('option', { name: '管理者' }))
    await user.click(save())

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0]![1].body.is_manager).toBe(true)
  })

  it('メール重複(409)は、メールアドレス欄にエラーを表示する', async () => {
    post.mockResolvedValue(
      failure(409, {
        error: { code: 'DUPLICATE_EMAIL', message: 'このメールアドレスは既に登録されています' },
      }),
    )
    const { user, onSaved } = setup()
    await fillCreate(user)
    await user.click(save())

    expect(await screen.findByText('このメールアドレスは既に登録されています')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('aria-invalid', 'true')
  })

  it('400 の項目エラーは入力欄に、対応できないものはフォーム全体に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [
            { field: 'department', message: '部署は100文字以内で入力してください' },
            { field: 'unknown', message: '想定外のエラー' },
          ],
        },
      }),
    )
    const { user } = setup()
    await fillCreate(user)
    await user.click(save())

    expect(await screen.findByText('部署は100文字以内で入力してください')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('想定外のエラー')
  })

  it('編集では password の 400 エラーを、表示先のある（フォーム全体の）エラーにする', async () => {
    put.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [{ field: 'password', message: 'パスワードは8文字以上で入力してください' }],
        },
      }),
    )
    const { user } = setup({ person })
    await user.type(screen.getByLabelText('氏名'), 'A')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'パスワードは8文字以上で入力してください',
    )
  })

  it('保存の通信中かどうかを通知する', async () => {
    let resolve!: (value: unknown) => void
    post.mockReturnValue(new Promise((r) => (resolve = r)))
    const onSubmittingChange = vi.fn()
    const { user } = setup({ onSubmittingChange })
    await fillCreate(user)
    await user.click(save())

    await waitFor(() => expect(onSubmittingChange).toHaveBeenLastCalledWith(true))
    resolve(ok())
    await waitFor(() => expect(onSubmittingChange).toHaveBeenLastCalledWith(false))
  })

  it('通信エラー時は汎用メッセージを表示し、再度保存できる', async () => {
    post.mockRejectedValue(new Error('network'))
    const { user } = setup()
    await fillCreate(user)
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent('営業担当者の保存に失敗しました')
    expect(save()).toBeEnabled()
  })

  it('送信中に再送信されても API は 1 回しか呼ばない', async () => {
    post.mockReturnValue(new Promise(() => {}))
    const { user } = setup()
    await fillCreate(user)

    const form = save().closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('キャンセルで onCancel を呼ぶ', async () => {
    const { user, onCancel } = setup()
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('SalesPersonForm（編集）', () => {
  it('既存の値を初期表示し、パスワード欄は表示しない', () => {
    setup({ person })

    expect(screen.getByLabelText('氏名')).toHaveValue('山田太郎')
    expect(screen.getByLabelText('メールアドレス')).toHaveValue('yamada@example.com')
    expect(screen.getByLabelText('部署')).toHaveValue('営業1課')
    expect(screen.getByRole('combobox', { name: '権限' })).toHaveTextContent('一般')
    expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument()
  })

  it('変更して保存すると、パスワードを含めず PUT する', async () => {
    put.mockResolvedValue(ok(200))
    const { user, onSaved } = setup({ person })
    await user.clear(screen.getByLabelText('部署'))
    await user.type(screen.getByLabelText('部署'), '営業3課')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/sales-persons/{id}', {
      params: { path: { id: 7 } },
      body: {
        name: '山田太郎',
        email: 'yamada@example.com',
        department: '営業3課',
        is_manager: false,
      },
    })
    expect(put.mock.calls[0]![1].body).not.toHaveProperty('password')
    expect(post).not.toHaveBeenCalled()
  })

  it('自分自身の編集では、権限を変更できない', () => {
    setup({ person: { ...person, is_manager: true }, isSelf: true })

    expect(screen.getByRole('combobox', { name: '権限' })).toBeDisabled()
    expect(screen.getByText('自分自身の権限は変更できません')).toBeInTheDocument()
  })

  it('他人の編集では、権限を変更できる', () => {
    setup({ person })
    expect(screen.getByRole('combobox', { name: '権限' })).toBeEnabled()
  })

  it('最後の管理者の降格(409)のメッセージを、フォーム全体に表示する', async () => {
    put.mockResolvedValue(
      failure(409, {
        error: { code: 'RESOURCE_IN_USE', message: '最後の管理者は降格・削除できません' },
      }),
    )
    const { user, onSaved } = setup({ person: { ...person, is_manager: true } })
    await user.clear(screen.getByLabelText('氏名'))
    await user.type(screen.getByLabelText('氏名'), '田中部長')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent('最後の管理者は降格・削除できません')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('保存中に対象が削除済み(404)なら、onNotFound を呼ぶ', async () => {
    put.mockResolvedValue(failure(404, { error: { code: 'NOT_FOUND', message: 'なし' } }))
    const { user, onNotFound, onSaved } = setup({ person })
    await user.clear(screen.getByLabelText('氏名'))
    await user.type(screen.getByLabelText('氏名'), '山田花子')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())

    await waitFor(() => expect(onNotFound).toHaveBeenCalled())
    expect(onSaved).not.toHaveBeenCalled()
  })
})
