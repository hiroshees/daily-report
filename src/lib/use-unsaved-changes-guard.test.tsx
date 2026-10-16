import { render, screen } from '@testing-library/react'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'

function Page({ active }: { active: boolean }) {
  useUnsavedChangesGuard(active, '破棄しますか？')
  return (
    <div>
      <a href="/reports">一覧</a>
      <a href="https://example.com/">外部</a>
      <a href="/reports/new">同じページ</a>
    </div>
  )
}

/**
 * クリックがフックに遷移を止められたか。jsdom は遷移を実装していないため、
 * バブリングの最後で既定動作を打ち消し、その手前の状態を記録する。
 * フックが伝播を止めた場合は、このリスナーに届かない
 */
function click(name: string, init: MouseEventInit = {}) {
  let reached = false
  let prevented = false
  const record = (event: Event) => {
    reached = true
    prevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', record)
  screen
    .getByRole('link', { name })
    .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
  window.removeEventListener('click', record)
  return !reached || prevented
}

beforeEach(() => {
  window.history.pushState(null, '', '/reports/new')
})
afterEach(() => vi.restoreAllMocks())

describe('useUnsavedChangesGuard', () => {
  it('無効の間は何もしない', () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<Page active={false} />)

    expect(click('一覧')).toBe(false)
    expect(confirm).not.toHaveBeenCalled()

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('有効な間、アプリ内リンクで確認し、拒否したら遷移を止める', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Page active />)

    expect(click('一覧')).toBe(true)
    expect(confirm).toHaveBeenCalledWith('破棄しますか？')
  })

  it('確認を許可したら遷移を止めない', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Page active />)

    expect(click('一覧')).toBe(false)
  })

  it('外部リンク・同じページ・修飾キー付きのクリックは確認しない', () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<Page active />)

    click('外部')
    click('同じページ')
    click('一覧', { ctrlKey: true })

    expect(confirm).not.toHaveBeenCalled()
  })

  it('有効な間だけ beforeunload で離脱を確認する', () => {
    render(<Page active />)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('アンマウントでリスナーを外す', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { unmount } = render(<Page active />)
    unmount()

    expect(confirm).not.toHaveBeenCalled()
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
