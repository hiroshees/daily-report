// @vitest-environment node
import { getSessionUser } from '@/lib/session'
import { requireManagerPage, requirePageUser } from '@/server/page-auth'

vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn() }))
// Next.js の redirect() は例外を投げて処理を中断する
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

const member = {
  id: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  isManager: false,
}
const manager = { ...member, id: 2, name: '田中部長', isManager: true }

beforeEach(() => vi.resetAllMocks())

describe('requirePageUser', () => {
  it('ログイン済みならユーザーを返す', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(member)
    await expect(requirePageUser()).resolves.toEqual(member)
  })

  it('未ログイン（期限切れ・失効を含む）ならログイン画面へ', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    await expect(requirePageUser()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})

describe('requireManagerPage（管理者専用ページ）', () => {
  it('管理者は許可', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(manager)
    await expect(requireManagerPage()).resolves.toEqual({ allowed: true, user: manager })
  })

  it('一般ユーザーは許可しない（URL 直打ちでも画面を見せない）', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(member)
    await expect(requireManagerPage()).resolves.toEqual({ allowed: false, user: member })
  })

  it('未ログインならログイン画面へ（権限エラーではない）', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    await expect(requireManagerPage()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})
