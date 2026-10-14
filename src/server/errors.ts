import { ERROR_CODES } from '@/schemas/common'

export type ErrorCode = (typeof ERROR_CODES)[number]

export type ErrorDetail = { field: string; message: string }

/** エラーコードと HTTP ステータス（doc/API_SCHEME.md 4 章）。全コードを網羅していないと型エラーになる */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  DUPLICATE_REPORT: 409,
  DUPLICATE_EMAIL: 409,
  RESOURCE_IN_USE: 409,
  EDIT_PERIOD_EXPIRED: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
}

/** 既定のエラーメッセージ（doc/API_SCHEME.md 4 章） */
export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  AUTH_TOKEN_EXPIRED: 'トークンの有効期限が切れています',
  AUTH_UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'この操作を行う権限がありません',
  VALIDATION_ERROR: '入力値が不正です',
  DUPLICATE_REPORT: '同じ日付の日報が既に存在します',
  DUPLICATE_EMAIL: 'このメールアドレスは既に登録されています',
  RESOURCE_IN_USE: '他のデータから参照されているため削除できません',
  EDIT_PERIOD_EXPIRED: '編集可能な期間を過ぎています',
  NOT_FOUND: 'リソースが見つかりません',
  INTERNAL_ERROR: 'サーバーエラーが発生しました',
}

/**
 * API が意図して返すエラー。Route Handler 内で throw すると、
 * `defineRoute` がエラーレスポンス `{ error: { code, message, details? } }` に変換する。
 */
export class ApiError extends Error {
  readonly status: number

  constructor(
    readonly code: ErrorCode,
    message: string = ERROR_MESSAGE[code],
    readonly details?: ErrorDetail[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = ERROR_STATUS[code]
  }
}
