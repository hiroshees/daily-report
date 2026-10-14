import { getNavItems } from '@/lib/navigation'

describe('getNavItems', () => {
  it('一般ユーザーには日報一覧のみ表示する', () => {
    expect(getNavItems({ isManager: false }).map((i) => i.href)).toEqual(['/reports'])
  })

  it('管理者にはマスタ管理のリンクも表示する', () => {
    expect(getNavItems({ isManager: true }).map((i) => i.href)).toEqual([
      '/reports',
      '/customers',
      '/sales-persons',
    ])
  })
})
