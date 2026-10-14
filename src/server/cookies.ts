export const SESSION_COOKIE = 'session'

/**
 * ログイン用 Cookie。HttpOnly（JavaScript から読めない）+ SameSite=Lax（他サイトからの POST に付かない）。
 * Secure は本番のみ（開発では http://localhost で動かすため）。
 */
export function buildSessionCookie(
  token: string,
  maxAgeSeconds: number,
  secure = process.env.NODE_ENV === 'production',
): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

/** Cookie を削除する（属性は発行時と同じにする） */
export function clearSessionCookie(secure = process.env.NODE_ENV === 'production'): string {
  return buildSessionCookie('', 0, secure)
}

export type TokenSource = 'authorization' | 'cookie'

/**
 * リクエストからトークンを取り出す。`Authorization: Bearer` を優先し、無ければ Cookie。
 * （ブラウザは Cookie、API クライアントは Bearer を使う）
 */
export function readToken(headers: Headers): { token: string; source: TokenSource } | null {
  const bearer = /^Bearer +(\S+)$/i.exec(headers.get('authorization') ?? '')
  if (bearer) return { token: bearer[1]!, source: 'authorization' }

  for (const part of (headers.get('cookie') ?? '').split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() === SESSION_COOKIE) {
      const value = part.slice(separator + 1).trim()
      if (value) return { token: value, source: 'cookie' }
    }
  }
  return null
}
