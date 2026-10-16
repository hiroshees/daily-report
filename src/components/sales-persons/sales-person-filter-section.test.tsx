import { render, screen } from '@testing-library/react'
import { SalesPersonFilterSection } from '@/components/sales-persons/sales-person-filter-section'
import { listSalesPersons } from '@/server/services/sales-person'

vi.mock('@/server/services/sales-person', () => ({ listSalesPersons: vi.fn() }))
vi.mock('@/components/sales-persons/sales-person-filter', () => ({
  SalesPersonFilter: (props: unknown) => <pre data-testid="filter">{JSON.stringify(props)}</pre>,
}))

const person = (id: number, department: string) => ({
  id,
  name: `担当${id}`,
  email: `p${id}@example.com`,
  department,
  is_manager: false,
})
const propsOf = () => JSON.parse(screen.getByTestId('filter').textContent ?? '{}')

beforeEach(() => vi.resetAllMocks())

describe('SalesPersonFilterSection', () => {
  it('部署の選択肢は、絞り込み前の全担当者から重複を除いて渡す', async () => {
    vi.mocked(listSalesPersons).mockResolvedValue({
      data: [person(1, '営業2課'), person(2, '営業1課'), person(3, '営業1課')],
    })
    render(await SalesPersonFilterSection({ current: { department: '営業2課' } }))

    expect(listSalesPersons).toHaveBeenCalledWith({})
    expect(propsOf().departments).toEqual(['営業1課', '営業2課'])
    expect(propsOf().current).toEqual({ department: '営業2課' })
  })

  it('取得に失敗しても、選択肢を空にして表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listSalesPersons).mockRejectedValue(new Error('db down'))
    render(await SalesPersonFilterSection({ current: {} }))

    expect(propsOf().departments).toEqual([])
  })

  it('選択肢を渡したときは取得しない', async () => {
    render(await SalesPersonFilterSection({ current: {}, departments: [] }))

    expect(listSalesPersons).not.toHaveBeenCalled()
    expect(propsOf().departments).toEqual([])
  })
})
