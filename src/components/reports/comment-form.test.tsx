import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CommentForm } from '@/components/reports/comment-form'
import { apiClient } from '@/lib/api-client'

const router = { refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>

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

const input = () => screen.getByLabelText('コメントを追加')
const submit = () => screen.getByRole('button', { name: /^投稿/ })

beforeEach(() => vi.resetAllMocks())

describe('CommentForm', () => {
  it('未入力の間は投稿できない', () => {
    render(<CommentForm reportId={42} />)
    expect(submit()).toBeDisabled()
  })

  it('投稿すると API を呼び、入力欄をクリアして一覧を再取得する', async () => {
    post.mockResolvedValue(ok())
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)

    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith('/reports/{id}/comments', {
      params: { path: { id: 42 } },
      body: { comment: '確認しました' },
    })
    expect(input()).toHaveValue('')
    expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました')
  })

  it('投稿後に続けて、もう一度投稿できる', async () => {
    post.mockResolvedValue(ok())
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)

    for (const text of ['1 回目', '2 回目']) {
      await user.type(input(), text)
      await waitFor(() => expect(submit()).toBeEnabled())
      await user.click(submit())
      await waitFor(() => expect(input()).toHaveValue(''))
    }

    expect(post).toHaveBeenCalledTimes(2)
  })

  it('空白のみは必須エラーにする', async () => {
    render(<CommentForm reportId={42} />)
    fireEvent.change(input(), { target: { value: '   ' } })

    expect(await screen.findByText('コメントは必須項目です')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('501 文字でエラーを表示し、投稿できない。500 文字なら投稿できる', async () => {
    render(<CommentForm reportId={42} />)

    fireEvent.change(input(), { target: { value: 'あ'.repeat(501) } })
    expect(await screen.findByText('コメントは500文字以内で入力してください')).toBeInTheDocument()
    expect(screen.getByText('501/500')).toBeInTheDocument()
    expect(submit()).toBeDisabled()

    fireEvent.change(input(), { target: { value: 'あ'.repeat(500) } })
    await waitFor(() => expect(submit()).toBeEnabled())
  })

  it('権限エラー(403)のメッセージを表示し、入力は残す', async () => {
    post.mockResolvedValue(
      failure(403, { error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' } }),
    )
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent('この操作を行う権限がありません')
    expect(input()).toHaveValue('確認しました')
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('400 で comment 以外の項目のエラーだけでも、無言にせずフォーム全体に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [{ field: 'report_id', message: '日報の指定が正しくありません' }],
        },
      }),
    )
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent('日報の指定が正しくありません')
    expect(input()).toHaveValue('確認しました')
  })

  it('400 で comment のエラーは入力欄に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [{ field: 'comment', message: 'コメントは500文字以内で入力してください' }],
        },
      }),
    )
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    expect(await screen.findByText('コメントは500文字以内で入力してください')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('投稿中は入力欄を編集できず、完了後に編集できる', async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void
    post.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    await waitFor(() => expect(input()).toHaveAttribute('readonly'))

    resolve(ok())
    await waitFor(() => expect(input()).not.toHaveAttribute('readonly'))
    expect(input()).toHaveValue('')
  })

  it('通信エラー時は汎用メッセージを表示し、再投稿できる', async () => {
    post.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent('コメントの投稿に失敗しました')
    expect(submit()).toBeEnabled()
  })

  it('送信中に再送信されても API は 1 回しか呼ばない', async () => {
    post.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<CommentForm reportId={42} />)
    await user.type(input(), '確認しました')
    await waitFor(() => expect(submit()).toBeEnabled())

    const form = submit().closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledTimes(1)
  })
})
