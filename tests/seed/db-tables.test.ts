import { getModelTables } from '../../prisma/seed/db'

describe('getModelTables', () => {
  it('スキーマの全モデルのテーブルと採番列を返す', () => {
    expect(getModelTables()).toEqual([
      { table: 'sales_person', serialColumn: 'sales_person_id' },
      { table: 'customer', serialColumn: 'customer_id' },
      { table: 'daily_report', serialColumn: 'report_id' },
      { table: 'visit_record', serialColumn: 'visit_id' },
      { table: 'manager_comment', serialColumn: 'comment_id' },
      { table: 'revoked_token', serialColumn: null },
    ])
  })
})
