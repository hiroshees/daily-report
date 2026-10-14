import type { SessionUser } from '@/lib/session'

export type NavItem = {
  href: string
  label: string
}

/** ログインユーザーの権限に応じたナビゲーション項目（マスタ管理は管理者のみ） */
export function getNavItems(user: Pick<SessionUser, 'isManager'>): NavItem[] {
  const items: NavItem[] = [{ href: '/reports', label: '日報一覧' }]

  if (user.isManager) {
    items.push(
      { href: '/customers', label: '顧客マスタ' },
      { href: '/sales-persons', label: '営業マスタ' },
    )
  }

  return items
}
