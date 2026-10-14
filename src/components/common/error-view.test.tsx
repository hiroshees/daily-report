import { render, screen } from '@testing-library/react'
import { ForbiddenView, NotFoundView } from '@/components/common/error-view'
import { FormError } from '@/components/common/form-error'

describe('エラー表示', () => {
  it('403 は仕様のメッセージを表示する', () => {
    render(<ForbiddenView />)
    expect(screen.getByText('この操作を行う権限がありません')).toBeInTheDocument()
  })

  it('404 は一覧へ戻るリンクを表示する', () => {
    render(<NotFoundView />)
    expect(screen.getByRole('link', { name: '日報一覧へ戻る' })).toHaveAttribute('href', '/reports')
  })

  it('FormError はメッセージがあるときだけ alert を表示する', () => {
    const { rerender } = render(<FormError message={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<FormError message="メールアドレスまたはパスワードが正しくありません" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'メールアドレスまたはパスワードが正しくありません',
    )
  })
})
