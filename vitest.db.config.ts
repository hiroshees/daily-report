import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { resolveTestDatabaseUrl } from './tests/db/env'

// DB を使うテスト（*.db.test.ts）用の設定。`pnpm test:db` で実行する。
// 事前に `docker compose up -d` でテスト用 DB を起動しておくこと。
const testDatabaseUrl = resolveTestDatabaseUrl()

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.db.test.ts'],
    globalSetup: ['./tests/db/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl, DIRECT_URL: testDatabaseUrl },
    // 1つの DB を共有するため、ファイル間も直列で実行する
    fileParallelism: false,
  },
})
