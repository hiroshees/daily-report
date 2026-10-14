export const DEFAULT_REDIRECT_PATH = '/reports'

const LOGIN_PATH = '/login'
// 制御文字（タブ・改行など）。ブラウザはこれらを取り除いて解釈するため、`/\t/evil.com` が `//evil.com` になりうる
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
const BASE = 'http://localhost'

/**
 * ログイン後の遷移先として安全なパスだけを返す（オープンリダイレクト対策）。
 * 同一オリジンの相対パス（`/` で始まり、`//` や `/\` で始まらない）のみ許可し、それ以外は既定値にする。
 * ログイン画面自身は、遷移の繰り返しを避けるため既定値にする。
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT_PATH
  if (value.includes('\\') || CONTROL_CHARACTERS.test(value)) return DEFAULT_REDIRECT_PATH

  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return DEFAULT_REDIRECT_PATH
  }
  if (url.origin !== BASE) return DEFAULT_REDIRECT_PATH
  if (url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`)) {
    return DEFAULT_REDIRECT_PATH
  }

  return url.pathname + url.search + url.hash
}
