import { z } from 'zod'

export const JWT_SECRET_MIN_LENGTH = 32
const DURATION_PATTERN = /^(\d+)([smhd])$/
const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const

/** `24h` / `30m` / `7d` / `3600s` 形式の期間を秒に変換する */
export function parseDurationSeconds(value: string): number {
  const match = DURATION_PATTERN.exec(value)
  if (!match) throw new Error(`期間の形式が正しくありません: "${value}"（例: 24h, 30m, 7d）`)
  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS]
}

const AuthEnvSchema = z.object({
  JWT_SECRET: z.string({ error: 'JWT_SECRET が設定されていません' }).min(JWT_SECRET_MIN_LENGTH, {
    error: `JWT_SECRET は${JWT_SECRET_MIN_LENGTH}文字以上にしてください（例: openssl rand -base64 48）`,
  }),
  JWT_EXPIRES_IN: z
    .string()
    .regex(DURATION_PATTERN, { error: 'JWT_EXPIRES_IN は 24h / 30m / 7d の形式で指定してください' })
    .default('24h'),
})

export type AuthEnv = {
  secret: Uint8Array
  /** トークンの有効期間（秒） */
  ttlSeconds: number
}

let cached: { key: string; value: AuthEnv } | undefined

/**
 * 認証に必要な環境変数を検証して返す。不正なら起動時（instrumentation）にエラーにする。
 * メッセージには秘密の値を含めない。
 */
export function getAuthEnv(env: Record<string, string | undefined> = process.env): AuthEnv {
  const cacheKey = `${env.JWT_SECRET}\n${env.JWT_EXPIRES_IN}`
  if (cached?.key === cacheKey) return cached.value

  const result = AuthEnvSchema.safeParse({
    JWT_SECRET: env.JWT_SECRET || undefined,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || undefined,
  })
  if (!result.success) {
    const reasons = result.error.issues.map((issue) => `- ${issue.message}`).join('\n')
    throw new Error(`環境変数が正しくありません:\n${reasons}`)
  }

  const value = {
    secret: new TextEncoder().encode(result.data.JWT_SECRET),
    ttlSeconds: parseDurationSeconds(result.data.JWT_EXPIRES_IN),
  }
  cached = { key: cacheKey, value }
  return value
}

/** 日報の編集可能日数の既定値。TODO(#27): 期間は未確定のため暫定値 */
export const DEFAULT_REPORT_EDIT_LIMIT_DAYS = 7

/** `REPORT_EDIT_LIMIT_DAYS`（作成から何日まで編集可能か）。未設定なら既定値、不正（0 以上の整数以外）ならエラー */
export function getReportEditLimitDays(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.REPORT_EDIT_LIMIT_DAYS
  if (!raw) return DEFAULT_REPORT_EDIT_LIMIT_DAYS
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      '環境変数が正しくありません:\n- REPORT_EDIT_LIMIT_DAYS は 0 以上の整数で指定してください',
    )
  }
  return Number(raw)
}
