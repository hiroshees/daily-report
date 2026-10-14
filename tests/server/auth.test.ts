// @vitest-environment node
import { getSessionUser } from '@/lib/session'
import { assertCanEditReport, canEditReport, requireAuth, requireManager } from '@/server/auth'

vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn() }))

const member = { id: 1, name: '山田太郎', isManager: false }
const manager = { id: 2, name: '田中部長', isManager: true }

beforeEach(() => vi.resetAllMocks())

describe('requireAuth', () => {
  it('ログイン済みならユーザーを返す', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(member)
    await expect(requireAuth()).resolves.toEqual(member)
  })

  it('未ログインは 401 AUTH_UNAUTHORIZED', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    await expect(requireAuth()).rejects.toMatchObject({ code: 'AUTH_UNAUTHORIZED', status: 401 })
  })
})

describe('requireManager', () => {
  it('管理者ならユーザーを返す', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(manager)
    await expect(requireManager()).resolves.toEqual(manager)
  })

  it('一般ユーザーは 403 FORBIDDEN', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(member)
    await expect(requireManager()).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })

  it('未ログインは 401（403 ではない）', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    await expect(requireManager()).rejects.toMatchObject({ code: 'AUTH_UNAUTHORIZED', status: 401 })
  })
})

describe('日報の編集権限（作成者本人のみ）', () => {
  const report = { salesPersonId: 1 }

  it('本人は編集できる', () => {
    expect(canEditReport(member, report)).toBe(true)
    expect(() => assertCanEditReport(member, report)).not.toThrow()
  })

  it('他人の日報は編集できない', () => {
    expect(canEditReport({ id: 3 }, report)).toBe(false)
    expect(() => assertCanEditReport({ id: 3 }, report)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403 }),
    )
  })

  it('管理者でも他人の日報は編集できない', () => {
    expect(canEditReport(manager, report)).toBe(false)
  })

  it('管理者でも自分の日報は編集できる', () => {
    expect(canEditReport(manager, { salesPersonId: 2 })).toBe(true)
  })
})
