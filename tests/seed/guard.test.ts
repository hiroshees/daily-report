import { assertSeedAllowed } from '../../prisma/seed/guard'

const LOCAL = 'postgresql://u:p@localhost:5433/daily_report'
const NEON = 'postgresql://u:p@ep-example-123.ap-southeast-1.aws.neon.tech/neondb'

describe('assertSeedAllowed', () => {
  it('ローカル DB なら実行できる', () => {
    expect(() => assertSeedAllowed({ DATABASE_URL: LOCAL })).not.toThrow()
    expect(() => assertSeedAllowed({ DATABASE_URL: 'postgresql://u:p@127.0.0.1/db' })).not.toThrow()
  })

  it('本番（NODE_ENV / VERCEL_ENV）では、ローカル接続でも実行できない', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', DATABASE_URL: LOCAL })).toThrow('本番')
    expect(() => assertSeedAllowed({ VERCEL_ENV: 'production', DATABASE_URL: LOCAL })).toThrow(
      '本番',
    )
  })

  it('ローカル以外の接続先は、SEED_ALLOW_REMOTE=true がなければ実行できない', () => {
    expect(() => assertSeedAllowed({ DATABASE_URL: NEON })).toThrow('ローカルではありません')
    expect(() => assertSeedAllowed({ DATABASE_URL: NEON, SEED_ALLOW_REMOTE: 'true' })).not.toThrow()
  })

  it('許可しても本番では実行できない', () => {
    expect(() =>
      assertSeedAllowed({
        VERCEL_ENV: 'production',
        DATABASE_URL: NEON,
        SEED_ALLOW_REMOTE: 'true',
      }),
    ).toThrow('本番')
  })

  it('DATABASE_URL が未設定ならエラー', () => {
    expect(() => assertSeedAllowed({})).toThrow('DATABASE_URL')
  })
})
