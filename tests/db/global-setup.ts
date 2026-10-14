import { execSync } from 'node:child_process'
import { resolveTestDatabaseUrl } from './env'

/** テスト DB にマイグレーションを適用する（テスト実行前に1回だけ） */
export default function setup() {
  const url = resolveTestDatabaseUrl()

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  })
}
