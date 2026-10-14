import { render, screen } from '@testing-library/react'
import { AppHeader } from '@/components/layout/app-header'

vi.mock('next/navigation', () => ({ usePathname: () => '/reports' }))

const logoutAction = vi.fn()

describe('AppHeader', () => {
  it('タイトル・ユーザー名・ログアウトボタンを表示する', () => {
    render(
      <AppHeader
        user={{
          id: 1,
          name: '山田太郎',
          email: 'yamada@example.com',
          department: '営業1課',
          isManager: false,
        }}
        logoutAction={logoutAction}
      />,
    )

    expect(screen.getByRole('link', { name: '営業日報システム' })).toHaveAttribute(
      'href',
      '/reports',
    )
    expect(screen.getByText('山田太郎')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })

  it('一般ユーザーにはマスタ管理リンクを表示しない', () => {
    render(
      <AppHeader
        user={{
          id: 1,
          name: '山田太郎',
          email: 'yamada@example.com',
          department: '営業1課',
          isManager: false,
        }}
        logoutAction={logoutAction}
      />,
    )

    expect(screen.getByRole('link', { name: '日報一覧' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: '顧客マスタ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '営業マスタ' })).not.toBeInTheDocument()
  })

  it('管理者にはマスタ管理リンクを表示する', () => {
    render(
      <AppHeader
        user={{
          id: 2,
          name: '田中部長',
          email: 'tanaka@example.com',
          department: '営業1課',
          isManager: true,
        }}
        logoutAction={logoutAction}
      />,
    )

    expect(screen.getByRole('link', { name: '顧客マスタ' })).toHaveAttribute('href', '/customers')
    expect(screen.getByRole('link', { name: '営業マスタ' })).toHaveAttribute(
      'href',
      '/sales-persons',
    )
  })
})
