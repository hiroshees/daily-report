import { getSessionUser } from '@/lib/session'

describe('getSessionUser（認証実装までの暫定スタブ）', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['production', 'test'])(
    '%s では DEV_STUB_USER が設定されていても未ログイン扱いにする',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv)
      vi.stubEnv('DEV_STUB_USER', 'manager')

      expect(await getSessionUser()).toBeNull()
    },
  )

  it('development で DEV_STUB_USER=member なら一般ユーザーを返す', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_STUB_USER', 'member')

    expect(await getSessionUser()).toMatchObject({ isManager: false })
  })

  it('development で DEV_STUB_USER=manager なら管理者を返す', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_STUB_USER', 'manager')

    expect(await getSessionUser()).toMatchObject({ isManager: true })
  })

  it.each([undefined, '', 'admin'])(
    'development でも DEV_STUB_USER=%j なら未ログイン扱いにする',
    async (value) => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('DEV_STUB_USER', value as string)

      expect(await getSessionUser()).toBeNull()
    },
  )
})
