import { render, screen } from '@testing-library/react'
import { SalesPersonTable } from '@/components/sales-persons/sales-person-table'

// 操作ボタンは別のテストで確認する。ここでは渡された props（本人かどうか）だけを見る
vi.mock('@/components/sales-persons/sales-person-form-dialog', () => ({
  SalesPersonFormDialog: ({ person, isSelf }: { person?: { id: number }; isSelf?: boolean }) => (
    <span>
      編集:{person?.id}:{String(isSelf)}
    </span>
  ),
}))
vi.mock('@/components/sales-persons/sales-person-delete-button', () => ({
  SalesPersonDeleteButton: ({ personId, isSelf }: { personId: number; isSelf: boolean }) => (
    <span>
      削除:{personId}:{String(isSelf)}
    </span>
  ),
}))

const people = [
  {
    id: 1,
    name: '山田太郎',
    email: 'yamada@example.com',
    department: '営業1課',
    is_manager: false,
  },
  { id: 2, name: '田中部長', email: 'tanaka@example.com', department: '営業1課', is_manager: true },
]

describe('SalesPersonTable', () => {
  it('氏名・メール・部署・権限（一般/管理者）を表示する', () => {
    render(<SalesPersonTable people={people} currentUserId={2} />)

    expect(screen.getByText('yamada@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('営業1課')).toHaveLength(2)
    expect(screen.getByText('一般')).toBeInTheDocument()
    expect(screen.getByText('管理者')).toBeInTheDocument()
  })

  it('ログインユーザー本人の行だけ、自分自身として扱う', () => {
    render(<SalesPersonTable people={people} currentUserId={2} />)

    expect(screen.getByText('編集:1:false')).toBeInTheDocument()
    expect(screen.getByText('削除:1:false')).toBeInTheDocument()
    expect(screen.getByText('編集:2:true')).toBeInTheDocument()
    expect(screen.getByText('削除:2:true')).toBeInTheDocument()
  })
})
