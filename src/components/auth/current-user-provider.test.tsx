import { render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CurrentUserProvider, useCurrentUser } from '@/components/auth/current-user-provider'
import type { SessionUser } from '@/lib/session'

const user: SessionUser = {
  id: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  isManager: false,
}

function Name() {
  return <p>{useCurrentUser().name}</p>
}

describe('useCurrentUser', () => {
  it('Provider が渡したユーザーを返す', () => {
    render(
      <CurrentUserProvider user={user}>
        <Name />
      </CurrentUserProvider>,
    )

    expect(screen.getByText('山田太郎')).toBeInTheDocument()
  })

  it('権限（isManager）も参照できる', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CurrentUserProvider user={{ ...user, isManager: true }}>{children}</CurrentUserProvider>
    )

    expect(renderHook(() => useCurrentUser(), { wrapper }).result.current.isManager).toBe(true)
  })

  it('Provider の外で使うとエラー（未ログインの画面で誤って使えない）', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useCurrentUser())).toThrow('CurrentUserProvider')
  })
})
