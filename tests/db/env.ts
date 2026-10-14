import { existsSync } from 'node:fs'

/**
 * DB テスト用の接続先を解決する。
 * テストは全テーブルを TRUNCATE するため、開発用 DB を誤って消さないよう、
 * TEST_DATABASE_URL が未設定、またはデータベース名が `_test` で終わらない場合は実行を拒否する。
 */
export function resolveTestDatabaseUrl(): string {
  // .env があれば読み込む（既に設定済みの環境変数は上書きされない）
  if (existsSync('.env')) process.loadEnvFile('.env')
  const url = process.env.TEST_DATABASE_URL

  if (!url) {
    throw new Error('TEST_DATABASE_URL が未設定です。.env.example を参考に設定してください。')
  }

  const dbName = new URL(url).pathname.replace(/^\//, '')
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `TEST_DATABASE_URL のデータベース名は "_test" で終わる必要があります（現在: "${dbName}"）。`,
    )
  }

  return url
}
