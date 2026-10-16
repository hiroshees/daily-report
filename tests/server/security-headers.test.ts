import { buildContentSecurityPolicy, buildSecurityHeaders } from '@/server/security-headers'

const headerMap = (isDev: boolean) =>
  Object.fromEntries(buildSecurityHeaders(isDev).map(({ key, value }) => [key, value]))

describe('buildSecurityHeaders', () => {
  it('必要なセキュリティヘッダーを含む', () => {
    const headers = headerMap(false)

    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/)
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toBeDefined()
  })
})

describe('buildContentSecurityPolicy', () => {
  it('本番は eval を許可せず、フレーム埋め込みと外部オリジンを禁止する', () => {
    const csp = buildContentSecurityPolicy(false)

    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('開発では eval を許可し、HTTPS への強制はしない', () => {
    const csp = buildContentSecurityPolicy(true)

    expect(csp).toContain("'unsafe-eval'")
    expect(csp).not.toContain('upgrade-insecure-requests')
  })
})
