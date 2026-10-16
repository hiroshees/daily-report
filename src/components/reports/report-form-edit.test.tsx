import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportForm } from '@/components/reports/report-form'
import { apiClient } from '@/lib/api-client'

const router = { push: vi.fn(), refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { POST: vi.fn(), PUT: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/reports/customer-combobox', () => ({
  CustomerCombobox: ({
    value,
    selectedLabel,
    onChange,
  }: {
    value?: number
    selectedLabel?: string
    onChange: (id: number) => void
  }) => (
    <button type="button" onClick={() => onChange(9)}>
      {value === undefined ? '顧客を選択' : (selectedLabel ?? `顧客${value}`)}
    </button>
  ),
}))

const put = vi.mocked(apiClient.PUT) as unknown as ReturnType<typeof vi.fn>
const post = vi.mocked(apiClient.POST) as unknown as ReturnType<typeof vi.fn>

const initialValues = {
  problem: '既存の課題',
  plan: '既存の計画',
  visits: [
    { visit_id: 11, customer_id: 1, visit_time: '10:00', visit_content: 'ABC商事への訪問' },
    { visit_id: 12, customer_id: 2, visit_time: '', visit_content: 'XYZ工業への訪問' },
  ],
}

function renderForm() {
  const user = userEvent.setup()
  render(
    <ReportForm
      mode="edit"
      reportId={42}
      reportDate="2025-07-20"
      authorName="山田太郎"
      initialValues={initialValues}
      customerLabels={{ 1: 'ABC商事', 2: 'XYZ工業' }}
    />,
  )
  return user
}

const saveButton = () => screen.getByRole('button', { name: /^保存/ })

function ok() {
  return { response: new Response(null, { status: 200 }), data: { id: 42 }, error: undefined }
}
function failure(status: number, error: unknown) {
  return { response: new Response(null, { status }), data: undefined, error }
}

beforeEach(() => vi.resetAllMocks())

describe('ReportForm（編集 / SC004）', () => {
  it('既存の日付・作成者・内容を初期表示する。日付は変更できない', () => {
    renderForm()

    expect(screen.getByText('2025/07/20')).toBeInTheDocument()
    expect(screen.getByText('山田太郎')).toBeInTheDocument()
    expect(screen.getByLabelText('課題・相談')).toHaveValue('既存の課題')
    expect(screen.getByLabelText('明日の計画')).toHaveValue('既存の計画')
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'ABC商事' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'XYZ工業' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('ABC商事への訪問')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()
    expect(screen.queryByLabelText('日付')).not.toBeInTheDocument()
  })

  it('変更するまでは未保存の扱いにせず、保存ボタンは押せる', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = renderForm()

    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(confirm).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/reports/42')
  })

  it('追加・更新・削除した訪問記録を、id 付きの差分で PUT する', async () => {
    put.mockResolvedValue(ok())
    const user = renderForm()

    // 1 件目を更新、2 件目を削除、1 件を新規追加
    await user.clear(screen.getByDisplayValue('ABC商事への訪問'))
    await user.type(
      screen.getByLabelText('訪問内容', { selector: '#' + visitContentId(0) }),
      '更新後',
    )
    await user.click(screen.getByRole('button', { name: '訪問記録 2 を削除' }))
    await user.click(screen.getByRole('button', { name: '訪問記録を追加' }))
    await user.click(screen.getByRole('button', { name: '顧客を選択' }))
    const contents = screen.getAllByLabelText('訪問内容')
    await user.type(contents[1]!, '新規の訪問')

    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith('/reports/{id}', {
      params: { path: { id: 42 } },
      body: {
        problem: '既存の課題',
        plan: '既存の計画',
        visits: [
          { id: 11, customer_id: 1, visit_time: '10:00', visit_content: '更新後' },
          { customer_id: 9, visit_time: null, visit_content: '新規の訪問' },
        ],
      },
    })
    expect(post).not.toHaveBeenCalled()
  })

  it('保存すると日報詳細へ遷移する', async () => {
    put.mockResolvedValue(ok())
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports/42'))
    expect(await screen.findByRole('link', { name: '移動しない場合はこちら' })).toHaveAttribute(
      'href',
      '/reports/42',
    )
  })

  it('キャンセルで日報詳細へ戻る。入力がある場合は確認する', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(confirm).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/reports/42')
  })

  it('編集期限切れ(403)のメッセージを表示し、遷移しない', async () => {
    put.mockResolvedValue(
      failure(403, {
        error: { code: 'EDIT_PERIOD_EXPIRED', message: '編集可能な期間を過ぎています' },
      }),
    )
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('編集可能な期間を過ぎています')
    expect(router.push).not.toHaveBeenCalled()
    // 再送信しても保存できないため、保存ボタンを押せなくする。キャンセルは使える
    expect(saveButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeEnabled()
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('他人の日報(403)のメッセージを表示する', async () => {
    put.mockResolvedValue(
      failure(403, { error: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' } }),
    )
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('この操作を行う権限がありません')
    expect(saveButton()).toBeDisabled()
  })

  it('日報が削除済み(404)なら、メッセージを表示して保存できなくする', async () => {
    put.mockResolvedValue(
      failure(404, { error: { code: 'NOT_FOUND', message: 'リソースが見つかりません' } }),
    )
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('リソースが見つかりません')
    expect(saveButton()).toBeDisabled()
  })

  it('一時的な失敗(500)は、保存ボタンを押せるままにして再送信できる', async () => {
    put.mockResolvedValueOnce(
      failure(500, { error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } }),
    )
    put.mockResolvedValueOnce(ok())
    const user = renderForm()
    await user.type(screen.getByLabelText('課題・相談'), '追記')
    await waitFor(() => expect(saveButton()).toBeEnabled())
    await user.click(saveButton())
    await screen.findByRole('alert')

    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reports/42'))
  })

  it('空にした必須項目はエラーにして保存できない', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('課題・相談'), { target: { value: '' } })

    expect(await screen.findByText('課題・相談は必須項目です')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})

/** 訪問内容の textarea（n 件目）の id。ラベルが同名で複数あるため id で特定する */
function visitContentId(index: number) {
  return screen.getAllByLabelText('訪問内容')[index]!.id
}
