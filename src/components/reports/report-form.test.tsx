import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ReportForm } from '@/components/reports/report-form'
import { apiClient } from '@/lib/api-client'

const router = { push: vi.fn(), refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }))
// 「本日」を差し替えられるようにする（日付をまたぐ場合の確認用）
const todayInJst = vi.hoisted(() => vi.fn())
vi.mock('@/lib/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date')>()),
  todayInJst,
}))
// 顧客の検索 UI は customer-combobox.test.tsx で確認する。ここでは選択だけを再現する
vi.mock('@/components/reports/customer-combobox', () => ({
  CustomerCombobox: ({ value, onChange }: { value?: number; onChange: (id: number) => void }) => (
    <button type="button" onClick={() => onChange(7)}>
      {value === undefined ? '顧客を選択' : `顧客${value}`}
    </button>
  ),
}))

const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>

function ok() {
  return { response: new Response(null, { status: 201 }), data: { id: 1 }, error: undefined }
}
function failure(status: number, error: unknown) {
  return { response: new Response(null, { status }), data: undefined, error }
}

const problem = () => screen.getByLabelText('課題・相談')
const plan = () => screen.getByLabelText('明日の計画')
const saveButton = () => screen.getByRole('button', { name: /^保存/ })

function renderForm() {
  const user = userEvent.setup()
  render(<ReportForm reportDate="2025-07-27" authorName="山田太郎" />)
  return user
}

/** 長文の入力は type だと遅いため、change イベントで一括入力する */
function setText(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(problem(), '課題あり')
  await user.type(plan(), '計画あり')
}

beforeEach(() => {
  vi.resetAllMocks()
  todayInJst.mockReturnValue('2025-07-27')
})

describe('ReportForm（SC003）', () => {
  it('日付と作成者を表示する', () => {
    renderForm()

    expect(screen.getByText('2025/07/27')).toBeInTheDocument()
    expect(screen.getByText('山田太郎')).toBeInTheDocument()
  })

  it('未入力の間は保存できない', () => {
    renderForm()
    expect(saveButton()).toBeDisabled()
  })

  it('訪問記録なしでも、課題と計画を入力すれば保存できる（#27 決定まで）', async () => {
    const user = renderForm()
    await fillRequired(user)

    await waitFor(() => expect(saveButton()).toBeEnabled())
  })

  it('TC-REPORT-003: 訪問記録を5件追加・削除できる', async () => {
    const user = renderForm()
    const add = screen.getByRole('button', { name: '訪問記録を追加' })

    for (let i = 0; i < 5; i++) await user.click(add)
    expect(screen.getAllByRole('group')).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: '訪問記録 2 を削除' }))
    expect(screen.getAllByRole('group')).toHaveLength(4)
  })

  it('顧客が未選択の訪問記録がある間は保存できない', async () => {
    const user = renderForm()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.type(screen.getByLabelText('訪問内容'), '提案')

    await waitFor(() => expect(saveButton()).toBeDisabled())

    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    await waitFor(() => expect(saveButton()).toBeEnabled())
  })

  it('TC-REPORT-004: 訪問内容 501 文字でエラーを表示し、保存できない', async () => {
    const user = renderForm()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    setText(screen.getByLabelText('訪問内容'), 'あ'.repeat(501))

    expect(await screen.findByText('訪問内容は500文字以内で入力してください')).toBeInTheDocument()
    expect(screen.getByText('501/500')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('TC-REPORT-004: 課題・計画 1001 文字でエラーを表示し、保存できない', async () => {
    renderForm()
    setText(problem(), 'あ'.repeat(1001))
    setText(plan(), 'い'.repeat(1001))

    expect(
      await screen.findByText('課題・相談は1000文字以内で入力してください'),
    ).toBeInTheDocument()
    expect(screen.getByText('明日の計画は1000文字以内で入力してください')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    // 上限ちょうどなら保存できる
    setText(problem(), 'あ'.repeat(1000))
    setText(plan(), 'い'.repeat(1000))
    await waitFor(() => expect(saveButton()).toBeEnabled())
  })

  it('空白のみの入力は必須エラーにする', async () => {
    renderForm()
    setText(problem(), '   ')

    expect(await screen.findByText('課題・相談は必須項目です')).toBeInTheDocument()
  })

  it('文字数カウンタを表示する', async () => {
    const user = renderForm()
    expect(screen.getAllByText('0/1000')).toHaveLength(2)

    await user.type(problem(), 'abc')
    expect(screen.getByText('3/1000')).toBeInTheDocument()
  })

  it('TC-REPORT-001: 保存すると API を呼び、一覧へ遷移してトーストを出す', async () => {
    post.mockResolvedValue(ok())
    const user = renderForm()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    await user.type(screen.getByLabelText('訪問内容'), '提案')
    fireEvent.change(screen.getByLabelText('訪問時刻（任意）'), { target: { value: '10:30' } })

    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'))
    expect(post).toHaveBeenCalledWith('/reports', {
      body: {
        report_date: '2025-07-27',
        problem: '課題あり',
        plan: '計画あり',
        visits: [{ customer_id: 7, visit_time: '10:30', visit_content: '提案' }],
      },
    })
    expect(toast.success).toHaveBeenCalledWith('日報を保存しました')
  })

  it('訪問時刻が空なら null で送る', async () => {
    post.mockResolvedValue(ok())
    const user = renderForm()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    await user.type(screen.getByLabelText('訪問内容'), '提案')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0]![1].body.visits[0].visit_time).toBeNull()
  })

  it('TC-REPORT-002: 重複(409)は「同じ日付の日報が既に存在します」を表示し、遷移しない', async () => {
    post.mockResolvedValue(
      failure(409, { error: { code: 'DUPLICATE_REPORT', message: 'duplicated' } }),
    )
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('同じ日付の日報が既に存在します')
    expect(router.push).not.toHaveBeenCalled()
    expect(saveButton()).toBeEnabled()
  })

  it('通信エラー時は汎用メッセージを表示し、再度保存できる', async () => {
    post.mockRejectedValue(new Error('network'))
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('日報の保存に失敗しました')
    expect(saveButton()).toBeEnabled()
  })

  it('送信中は保存ボタンを押せず、二重に送信されない', async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void
    post.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    await waitFor(() => expect(saveButton()).toBeDisabled())
    await user.click(saveButton())
    expect(post).toHaveBeenCalledTimes(1)

    resolve(ok())
    await waitFor(() => expect(router.push).toHaveBeenCalled())
  })

  it('画面を開いたまま日付が変わったら、送信時に本日付へ更新して保存する', async () => {
    post.mockResolvedValue(ok())
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())

    todayInJst.mockReturnValue('2025-07-28')
    await user.click(saveButton())

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0]![1].body.report_date).toBe('2025-07-28')
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('2025/07/28'))
    expect(screen.getByText('2025/07/28')).toBeInTheDocument()
  })

  it('400 の訪問記録のエラーを、該当の入力欄に表示する', async () => {
    post.mockResolvedValue(
      failure(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: [
            { field: 'visits.0.visit_content', message: '訪問内容は500文字以内で入力してください' },
            { field: 'unknown', message: '想定外の項目のエラー' },
          ],
        },
      }),
    )
    const user = renderForm()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    await user.type(screen.getByLabelText('訪問内容'), '提案')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByText('訪問内容は500文字以内で入力してください')).toBeInTheDocument()
    // 入力欄に対応できないエラーは、フォーム全体のエラーに出す
    expect(screen.getByRole('alert')).toHaveTextContent('想定外の項目のエラー')
  })

  it('保存後に画面遷移が起きなくても、一覧への案内リンクを表示する', async () => {
    post.mockResolvedValue(ok())
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('link', { name: '移動しない場合はこちら' })).toHaveAttribute(
      'href',
      '/reports',
    )
  })

  it('送信中にフォームが再送信されても、API は 1 回しか呼ばない', async () => {
    post.mockReturnValue(new Promise(() => {}))
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())

    const form = saveButton().closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('保存に失敗したあとは、同じ内容で再送信できる', async () => {
    post.mockResolvedValueOnce(failure(500, { error: { code: 'INTERNAL_ERROR', message: 'ng' } }))
    post.mockResolvedValueOnce(ok())
    const user = renderForm()
    await fillRequired(user)
    await waitFor(() => expect(saveButton()).toBeEnabled())

    await user.click(saveButton())
    await screen.findByRole('alert')
    await user.click(saveButton())

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports'))
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('キャンセルで一覧へ戻る。入力がある場合は確認し、拒否したら留まる', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = renderForm()

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(router.push).toHaveBeenCalledWith('/reports')
    expect(confirm).not.toHaveBeenCalled()

    router.push.mockClear()
    await user.type(problem(), 'x')
    confirm.mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(confirm).toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(router.push).toHaveBeenCalledWith('/reports')
  })

  it('未保存の入力がある間だけ beforeunload で離脱を確認する', async () => {
    const user = renderForm()

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await user.type(problem(), 'x')
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })
})
