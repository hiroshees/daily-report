import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('タイトルを表示する', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: '営業日報システム' })).toBeInTheDocument()
  })
})
