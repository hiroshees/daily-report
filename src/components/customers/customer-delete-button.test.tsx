import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CustomerDeleteButton } from '@/components/customers/customer-delete-button'
import { apiClient } from '@/lib/api-client'

const router = { refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api-client', () => ({ apiClient: { DELETE: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const del = vi.mocked(apiClient.DELETE) as unknown as ReturnType<typeof vi.fn>

const ok = () => ({
  response: new Response(null, { status: 204 }),
  data: undefined,
  error: undefined,
})
const failure = (status: number, error: unknown) => ({
  response: new Response(null, { status }),
  data: undefined,
  error,
})

async function openDialog() {
  const user = userEvent.setup()
  render(<CustomerDeleteButton customerId={7} companyName="ABC商事" />)
  await user.click(screen.getByRole('button', { name: 'ABC商事を削除' }))
  return user
}

beforeEach(() => vi.resetAllMocks())

describe('CustomerDeleteButton', () => {
  it('確認ダイアログを出し、確定するまで削除しない', async () => {
    await openDialog()

    expect(screen.getByRole('alertdialog')).toHaveTextContent('「ABC商事」を削除')
    expect(del).not.toHaveBeenCalled()
  })

  it('キャンセルすると削除しない', async () => {
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
  })

  it('確定すると削除し、閉じてトーストを出し、一覧を再取得する', async () => {
    del.mockResolvedValue(ok())
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: '削除する' }))

    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(del).toHaveBeenCalledWith('/customers/{id}', { params: { path: { id: 7 } } })
    expect(toast.success).toHaveBeenCalledWith('顧客を削除しました')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('参照中(409)の顧客は、メッセージを表示してダイアログを開いたままにする', async () => {
    del.mockResolvedValue(
      failure(409, {
        error: {
          code: 'RESOURCE_IN_USE',
          message: '他のデータから参照されているため削除できません',
        },
      }),
    )
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: '削除する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '他のデータから参照されているため削除できません',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('開き直すと前回のエラーは消えている', async () => {
    del.mockResolvedValue(
      failure(409, { error: { code: 'RESOURCE_IN_USE', message: '参照中です' } }),
    )
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: '削除する' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    await user.click(screen.getByRole('button', { name: 'ABC商事を削除' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('通信エラー時は汎用メッセージを表示する', async () => {
    del.mockRejectedValue(new Error('network'))
    const user = await openDialog()
    await user.click(screen.getByRole('button', { name: '削除する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客の削除に失敗しました')
  })
})
