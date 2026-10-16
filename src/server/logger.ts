/**
 * 構造化 JSON ログ（1 イベント = 1 行）。stdout / stderr に出力し、Vercel Logs が自動収集する。
 *
 * 記録しない情報：パスワード、JWT、Cookie、リクエストボディ全文、日報本文（個人・取引情報）。
 * 呼び出し側が渡さないことに加え、下の `REDACTED_KEYS` に当たるキーは値を伏せて二重に守る。
 */
export type LogLevel = 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

/** 値を出力しないキー（部分一致・大文字小文字無視）。うっかり渡されても漏れないようにする */
const REDACTED_KEYS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'body',
  'problem',
  'plan',
  'visit_content',
]

const MAX_STRING_LENGTH = 512

function sanitize(fields: LogFields): LogFields {
  const result: LogFields = {}
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase()
    if (REDACTED_KEYS.some((word) => lower.includes(word))) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      result[key] = value.slice(0, MAX_STRING_LENGTH) // ログ汚染・肥大化の防止
    } else {
      result[key] = value
    }
  }
  return result
}

/** 1 行の JSON として出力する。error は stderr、それ以外は stdout */
export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  // 予約フィールド（time / level / message）は fields で上書きさせない
  const line = JSON.stringify({
    ...sanitize(fields),
    time: new Date().toISOString(),
    level,
    message,
  })
  if (level === 'error') console.error(line)
  else console.log(line)
}

/** プロキシ経由のクライアント IP（`X-Forwarded-For` の先頭）。取れなければ null */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || null
}

/** リクエストに共通のログ項目（メソッド・パス・IP・UA）。クエリ文字列は含めない */
export function requestLogFields(request: Request, requestId: string): LogFields {
  return {
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
  }
}
