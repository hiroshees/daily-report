import {
  DEFAULT_REPORT_EDIT_LIMIT_DAYS,
  getAuthEnv,
  getReportEditLimitDays,
  JWT_SECRET_MIN_LENGTH,
  parseDurationSeconds,
} from '@/server/env'

const SECRET = 'a'.repeat(JWT_SECRET_MIN_LENGTH)

describe('parseDurationSeconds', () => {
  it.each([
    ['30s', 30],
    ['30m', 1800],
    ['24h', 86400],
    ['7d', 604800],
    ['0s', 0],
  ])('%s → %i 秒', (value, seconds) => {
    expect(parseDurationSeconds(value)).toBe(seconds)
  })

  it.each(['', '24', 'h', '1.5h', '-1h', '24H', '1w', '24 h'])('%j は不正な形式', (value) => {
    expect(() => parseDurationSeconds(value)).toThrow('形式が正しくありません')
  })
})

describe('getAuthEnv（認証の環境変数。起動時に検証する）', () => {
  it('JWT_SECRET が十分な長さなら、鍵と有効期間（既定 24h）を返す', () => {
    const env = getAuthEnv({ JWT_SECRET: SECRET })

    expect(env.ttlSeconds).toBe(86400)
    expect(new TextDecoder().decode(env.secret)).toBe(SECRET)
  })

  it('JWT_EXPIRES_IN を指定できる', () => {
    expect(getAuthEnv({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '2h' }).ttlSeconds).toBe(7200)
  })

  it('JWT_SECRET が未設定・空ならエラー', () => {
    expect(() => getAuthEnv({})).toThrow('JWT_SECRET が設定されていません')
    expect(() => getAuthEnv({ JWT_SECRET: '' })).toThrow('JWT_SECRET が設定されていません')
  })

  it(`JWT_SECRET が${JWT_SECRET_MIN_LENGTH}文字未満ならエラー（値そのものはメッセージに出さない）`, () => {
    const weak = 'topsecret'

    expect(() => getAuthEnv({ JWT_SECRET: weak })).toThrow(`${JWT_SECRET_MIN_LENGTH}文字以上`)
    expect(() => getAuthEnv({ JWT_SECRET: weak })).not.toThrow(weak)
    expect(() => getAuthEnv({ JWT_SECRET: 'a'.repeat(JWT_SECRET_MIN_LENGTH - 1) })).toThrow()
  })

  it('JWT_EXPIRES_IN の形式が不正ならエラー', () => {
    expect(() => getAuthEnv({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '1w' })).toThrow('JWT_EXPIRES_IN')
  })
})

describe('getReportEditLimitDays（日報の編集可能日数）', () => {
  it('未設定・空なら既定値', () => {
    expect(getReportEditLimitDays({})).toBe(DEFAULT_REPORT_EDIT_LIMIT_DAYS)
    expect(getReportEditLimitDays({ REPORT_EDIT_LIMIT_DAYS: '' })).toBe(
      DEFAULT_REPORT_EDIT_LIMIT_DAYS,
    )
  })

  it('0 以上の整数を指定できる', () => {
    expect(getReportEditLimitDays({ REPORT_EDIT_LIMIT_DAYS: '30' })).toBe(30)
    expect(getReportEditLimitDays({ REPORT_EDIT_LIMIT_DAYS: '0' })).toBe(0)
  })

  it.each(['-1', '1.5', 'abc', '7d'])('%j は不正な値としてエラー', (value) => {
    expect(() => getReportEditLimitDays({ REPORT_EDIT_LIMIT_DAYS: value })).toThrow(
      'REPORT_EDIT_LIMIT_DAYS',
    )
  })
})
