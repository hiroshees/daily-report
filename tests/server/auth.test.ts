// @vitest-environment node
import { assertCanEditReport, canEditReport, requireAuth, requireManager } from '@/server/auth'
import { getSession } from '@/server/session'

vi.mock('@/server/session', () => ({ getSession: vi.fn() }))

const member = {
  id: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  isManager: false,
}
const manager = { ...member, id: 2, name: '田中部長', email: 'tanaka@example.com', isManager: true }

const request = new Request('http://localhost/api/v1/x', { headers: { Cookie: 'session=abc' } })

const loggedIn = (user: typeof member) =>
  vi.mocked(getSession).mockResolvedValue({
    ok: true,
    user,
    token: { jti: 'jti', expiresAt: new Date('2099-01-01') },
  })
const failed = (reason: 'missing' | 'expired' | 'invalid') =>
  vi.mocked(getSession).mockResolvedValue({ ok: false, reason })

beforeEach(() => vi.resetAllMocks())

describe('requireAuth', () => {
  it('ログイン済みならユーザーを返す（リクエストのヘッダーで判定する）', async () => {
    loggedIn(member)

    await expect(requireAuth(request)).resolves.toEqual(member)
    expect(getSession).toHaveBeenCalledWith(request.headers)
  })

  it('未ログイン・無効なトークンは 401 AUTH_UNAUTHORIZED', async () => {
    for (const reason of ['missing', 'invalid'] as const) {
      failed(reason)
      await expect(requireAuth(request)).rejects.toMatchObject({
        code: 'AUTH_UNAUTHORIZED',
        status: 401,
      })
    }
  })

  it('期限切れは 401 AUTH_TOKEN_EXPIRED', async () => {
    failed('expired')
    await expect(requireAuth(request)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_EXPIRED',
      status: 401,
    })
  })
})

describe('requireManager', () => {
  it('管理者ならユーザーを返す', async () => {
    loggedIn(manager)
    await expect(requireManager(request)).resolves.toEqual(manager)
  })

  it('一般ユーザーは 403 FORBIDDEN', async () => {
    loggedIn(member)
    await expect(requireManager(request)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })

  it('未ログインは 401（403 ではない）', async () => {
    failed('missing')
    await expect(requireManager(request)).rejects.toMatchObject({
      code: 'AUTH_UNAUTHORIZED',
      status: 401,
    })
  })

  it('期限切れは 401 AUTH_TOKEN_EXPIRED', async () => {
    failed('expired')
    await expect(requireManager(request)).rejects.toMatchObject({ code: 'AUTH_TOKEN_EXPIRED' })
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
