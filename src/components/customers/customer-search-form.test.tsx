import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerSearchForm } from '@/components/customers/customer-search-form'

const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

beforeEach(() => vi.resetAllMocks())

describe('CustomerSearchForm', () => {
  it('現在の検索語を初期表示する', () => {
    render(<CustomerSearchForm initial="ABC" />)
    expect(screen.getByLabelText('検索')).toHaveValue('ABC')
  })

  it('[検索] で、検索語つきの 1 ページ目へ移動する', async () => {
    const user = userEvent.setup()
    render(<CustomerSearchForm />)

    await user.type(screen.getByLabelText('検索'), 'ABC')
    await user.click(screen.getByRole('button', { name: '検索' }))

    expect(router.push).toHaveBeenCalledWith('/customers?search=ABC')
  })

  it('Enter キーでも検索できる', async () => {
    const user = userEvent.setup()
    render(<CustomerSearchForm />)

    await user.type(screen.getByLabelText('検索'), '佐藤{Enter}')

    expect(router.push).toHaveBeenCalledWith(`/customers?search=${encodeURIComponent('佐藤')}`)
  })

  it('検索語を空にして検索すると、条件なしの一覧に戻る', async () => {
    const user = userEvent.setup()
    render(<CustomerSearchForm initial="ABC" />)

    await user.clear(screen.getByLabelText('検索'))
    await user.click(screen.getByRole('button', { name: '検索' }))

    expect(router.push).toHaveBeenCalledWith('/customers')
  })
})
