import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/login-form'
import { apiClient } from '@/lib/api-client'

const router = { replace: vi.fn(), refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn() } }))

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>

const VALID = { email: 'yamada@example.com', password: 'Test1234!' }

function ok() {
  return { response: new Response(null, { status: 200 }), data: {}, error: undefined }
}
function failure(status: number, error: unknown) {
  return { response: new Response(null, { status }), data: undefined, error }
}

const emailInput = () => screen.getByLabelText('メールアドレス')
const passwordInput = () => screen.getByLabelText('パスワード')
const submitButton = () => screen.getByRole('button', { name: /ログイン/ })

async function fillIn(
  user: ReturnType<typeof userEvent.setup>,
  email = VALID.email,
  password = VALID.password,
) {
  await user.type(emailInput(), email)
  await user.type(passwordInput(), password)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('LoginForm（SC001）', () => {
  it('メールアドレス・パスワード・ログインボタンを表示する。パスワードはマスク表示', () => {
    render(<LoginForm redirectTo="/reports" />)

    expect(screen.getByText('営業日報システム')).toBeInTheDocument()
    expect(emailInput()).toHaveAttribute('type', 'email')
    expect(passwordInput()).toHaveAttribute('type', 'password')
    expect(submitButton()).toBeInTheDocument()
  })

  it('未入力の間はログインボタンを押せない', () => {
    render(<LoginForm redirectTo="/reports" />)
    expect(submitButton()).toBeDisabled()
  })

  it('正しく入力するとログインボタンが押せるようになる', async () => {
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/reports" />)

    await fillIn(user)

    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  describe('TC-AUTH-003: メールアドレスの形式が不正', () => {
    it('バリデーションエラーを表示し、ログインボタンを押せない', async () => {
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)

      await fillIn(user, 'invalid-email')

      expect(await screen.findByText('メールアドレスの形式が正しくありません')).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()
    })

    it('入力を直すとエラーが消えてボタンが押せるようになる', async () => {
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user, 'invalid-email')
      await screen.findByText('メールアドレスの形式が正しくありません')

      await user.clear(emailInput())
      await user.type(emailInput(), VALID.email)

      await waitFor(() => expect(submitButton()).toBeEnabled())
      expect(screen.queryByText('メールアドレスの形式が正しくありません')).not.toBeInTheDocument()
    })
  })

  it('パスワードが 8 文字未満なら、エラーを表示してボタンを押せない（8 文字なら押せる）', async () => {
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/reports" />)

    await fillIn(user, VALID.email, '1234567')
    expect(await screen.findByText('パスワードは8文字以上で入力してください')).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await user.type(passwordInput(), '8')
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  describe('ログイン成功（TC-AUTH-001）', () => {
    it('メールアドレスとパスワードを API に送り、遷移先へ移動する', async () => {
      post.mockResolvedValue(ok())
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports?page=2" />)

      await fillIn(user)
      await user.click(submitButton())

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/reports?page=2'))
      expect(post).toHaveBeenCalledWith('/auth/login', { body: VALID })
      // サーバー側で Cookie が設定されたので、サーバーコンポーネントを取得し直す
      expect(router.refresh).toHaveBeenCalled()
    })

    it('画面遷移が終わるまで、ボタンは押せないまま（二重送信の防止）', async () => {
      post.mockResolvedValue(ok())
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user)

      await user.click(submitButton())

      await waitFor(() => expect(router.replace).toHaveBeenCalled())
      expect(submitButton()).toBeDisabled()
    })
  })

  describe('ログイン失敗（TC-AUTH-002）', () => {
    const invalidCredentials = failure(401, {
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'メールアドレスまたはパスワードが正しくありません',
      },
    })

    it('エラーメッセージを表示し、ログイン画面に留まる', async () => {
      post.mockResolvedValue(invalidCredentials)
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user)

      await user.click(submitButton())

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'メールアドレスまたはパスワードが正しくありません',
      )
      expect(router.replace).not.toHaveBeenCalled()
    })

    it('パスワードは消して入力し直してもらい、メールアドレスは残す', async () => {
      post.mockResolvedValue(invalidCredentials)
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user)

      await user.click(submitButton())
      await screen.findByRole('alert')

      expect(passwordInput()).toHaveValue('')
      expect(emailInput()).toHaveValue(VALID.email)
      await waitFor(() => expect(passwordInput()).toHaveFocus())
    })

    it('入力し直して再度ログインできる（エラーは再送信で消える）', async () => {
      post.mockResolvedValueOnce(invalidCredentials).mockResolvedValueOnce(ok())
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user)
      await user.click(submitButton())
      await screen.findByRole('alert')

      await user.type(passwordInput(), VALID.password)
      await user.click(submitButton())

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/reports'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('サーバーの検証エラー（400）は、該当の項目に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [{ field: 'email', message: 'メールアドレスの形式が正しくありません' }],
        },
      }),
    )
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/reports" />)
    await fillIn(user)

    await user.click(submitButton())

    expect(await screen.findByText('メールアドレスの形式が正しくありません')).toBeInTheDocument()
  })

  it.each([
    [
      'サーバーエラー（500）',
      () =>
        post.mockResolvedValue(failure(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } })),
    ],
    [
      'CSRF などの拒否（403）',
      () => post.mockResolvedValue(failure(403, { error: { code: 'FORBIDDEN', message: 'x' } })),
    ],
    ['通信エラー', () => post.mockRejectedValue(new TypeError('Failed to fetch'))],
  ])(
    '%s のときは、一般的なエラーメッセージを表示する（サーバーの内部メッセージは出さない）',
    async (_name, arrange) => {
      arrange()
      const user = userEvent.setup()
      render(<LoginForm redirectTo="/reports" />)
      await fillIn(user)

      await user.click(submitButton())

      expect(await screen.findByRole('alert')).toHaveTextContent('ログインに失敗しました')
      expect(screen.getByRole('alert')).not.toHaveTextContent('x')
      expect(router.replace).not.toHaveBeenCalled()
    },
  )

  it('送信中はボタンを押せず、連続して押しても API は 1 回だけ（二重送信の防止）', async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void
    post.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/reports" />)
    await fillIn(user)

    await user.click(submitButton())
    await user.click(submitButton())
    await user.click(submitButton())

    expect(post).toHaveBeenCalledTimes(1)
    expect(submitButton()).toBeDisabled()
    expect(submitButton()).toHaveTextContent('ログイン中')

    resolve(ok())
    await waitFor(() => expect(router.replace).toHaveBeenCalled())
  })

  it('Enter キーでも送信できる', async () => {
    post.mockResolvedValue(ok())
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/reports" />)
    await user.type(emailInput(), VALID.email)

    await user.type(passwordInput(), `${VALID.password}{Enter}`)

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  })
})
