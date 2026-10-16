type Header = { key: string; value: string }

/**
 * Content-Security-Policy。
 *
 * Next.js（App Router）はインラインスクリプトを出力するため、nonce を使わない構成では
 * `script-src` に 'unsafe-inline' が必要。XSS の主な防御は React のエスケープと
 * `dangerouslySetInnerHTML` の禁止（ESLint）で行い、CSP は多層防御として
 * 外部オリジンの読み込み・フレーム埋め込み・フォーム送信先を制限する。
 */
export function buildContentSecurityPolicy(isDev: boolean): string {
  return [
    "default-src 'self'",
    // 開発時の React のデバッグ機能（eval）のため、開発のみ 'unsafe-eval' を許可する
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

/** 全レスポンスに付けるセキュリティヘッダー（`next.config.ts` の `headers()` から使う） */
export function buildSecurityHeaders(isDev: boolean): Header[] {
  return [
    // 2 年間 HTTPS のみにする（Vercel は HTTP を HTTPS へ自動リダイレクトする）
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // frame-ancestors を解釈しない古いブラウザ向け
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(isDev) },
  ]
}
