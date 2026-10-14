/**
 * シードは全テーブルを空にしてから投入するため、誤って本番や共有 DB に対して実行しないよう止める。
 * - 本番（NODE_ENV / VERCEL_ENV が production）では実行しない
 * - 接続先がローカル以外（Neon など）の場合は、明示的に許可（SEED_ALLOW_REMOTE=true）した場合のみ実行する
 */
export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') {
    throw new Error('本番環境ではシードを実行できません。')
  }

  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL が設定されていません。')
  }

  let host: string
  try {
    host = new URL(databaseUrl).hostname
  } catch {
    // 接続文字列にはパスワードが含まれるため、値そのものはメッセージに出さない
    throw new Error(
      'DATABASE_URL の形式が正しくありません。パスワードに記号が含まれる場合は URL エンコードしてください。',
    )
  }
  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)
  if (!isLocal && env.SEED_ALLOW_REMOTE !== 'true') {
    throw new Error(
      `接続先 "${host}" はローカルではありません。全データが削除されます。` +
        '意図している場合のみ SEED_ALLOW_REMOTE=true を付けて実行してください。',
    )
  }
}
