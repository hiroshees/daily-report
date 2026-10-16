import { toUpdateRequest } from '@/schemas/report-form'

describe('toUpdateRequest', () => {
  it('既存の訪問記録は id を付け、新規は付けない。空の訪問時刻は null にする', () => {
    const request = toUpdateRequest({
      problem: '課題',
      plan: '計画',
      visits: [
        { visit_id: 5, customer_id: 1, visit_time: '10:30', visit_content: '既存' },
        { customer_id: 2, visit_time: '', visit_content: '新規' },
      ],
    })

    expect(request).toEqual({
      problem: '課題',
      plan: '計画',
      visits: [
        { id: 5, customer_id: 1, visit_time: '10:30', visit_content: '既存' },
        { customer_id: 2, visit_time: null, visit_content: '新規' },
      ],
    })
    expect(request.visits[1]).not.toHaveProperty('id')
  })
})
