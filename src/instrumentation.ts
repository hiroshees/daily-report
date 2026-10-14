/** サーバー起動時に一度だけ呼ばれる。必須の環境変数が不正なら、リクエストを受ける前に起動を失敗させる */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAuthEnv } = await import('@/server/env')
    getAuthEnv()
  }
}
