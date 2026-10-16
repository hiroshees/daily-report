import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesPersonFilter } from '@/components/sales-persons/sales-person-filter'

const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

// Radix の Select が使うブラウザ API が jsdom に無いため補う
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
})

beforeEach(() => vi.resetAllMocks())

const departments = ['営業1課', '営業2課']

describe('SalesPersonFilter', () => {
  it('条件なしでは、部署・権限ともに「すべて」', () => {
    render(<SalesPersonFilter current={{}} departments={departments} />)

    expect(screen.getByRole('combobox', { name: '部署' })).toHaveTextContent('すべて')
    expect(screen.getByRole('combobox', { name: '権限' })).toHaveTextContent('すべて')
  })

  it('現在の条件を初期表示する。一覧にない部署は、その値を選択肢に加えて表示する', () => {
    const { rerender } = render(
      <SalesPersonFilter
        current={{ department: '営業2課', is_manager: 'true' }}
        departments={departments}
      />,
    )
    expect(screen.getByRole('combobox', { name: '部署' })).toHaveTextContent('営業2課')
    expect(screen.getByRole('combobox', { name: '権限' })).toHaveTextContent('管理者')

    rerender(
      <SalesPersonFilter current={{ department: '存在しない課' }} departments={departments} />,
    )
    expect(screen.getByRole('combobox', { name: '部署' })).toHaveTextContent('存在しない課')
  })

  it('部署を選ぶと、他の条件を保ったまま絞り込む', async () => {
    const user = userEvent.setup()
    render(<SalesPersonFilter current={{ is_manager: 'false' }} departments={departments} />)

    await user.click(screen.getByRole('combobox', { name: '部署' }))
    await user.click(await screen.findByRole('option', { name: '営業2課' }))

    expect(router.push).toHaveBeenCalledWith(
      `/sales-persons?department=${encodeURIComponent('営業2課')}&is_manager=false`,
    )
  })

  it('権限を選ぶと絞り込み、「すべて」で解除する', async () => {
    const user = userEvent.setup()
    render(<SalesPersonFilter current={{ is_manager: 'true' }} departments={departments} />)

    await user.click(screen.getByRole('combobox', { name: '権限' }))
    await user.click(await screen.findByRole('option', { name: 'すべて' }))

    expect(router.push).toHaveBeenCalledWith('/sales-persons')
  })
})
