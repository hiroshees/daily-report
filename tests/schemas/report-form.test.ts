import { EditReportFormSchema, ReportFormSchema, toUpdateRequest } from '@/schemas/report-form'

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

describe('フォームのスキーマ', () => {
  const visit = { customer_id: 1, visit_time: '', visit_content: '訪問' }
  const base = { problem: '課題', plan: '計画' }

  it('編集用は visit_id を保持し、作成用は保持しない', () => {
    const withId = { ...base, visits: [{ visit_id: 5, ...visit }] }

    expect(EditReportFormSchema.parse(withId).visits[0]).toHaveProperty('visit_id', 5)
    expect(ReportFormSchema.parse(withId).visits[0]).not.toHaveProperty('visit_id')
  })
})
