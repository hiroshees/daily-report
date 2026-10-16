import { z } from '@/schemas/zod'

/**
 * 入力項目の共通ルール（doc/SCREEN_DESIGN.md 5・6章）。
 * メッセージは「{項目名}は必須項目です」「{項目名}は{最大文字数}文字以内で入力してください」に合わせる。
 */

export const messages = {
  required: (label: string) => `${label}は必須項目です`,
  maxLength: (label: string, max: number) => `${label}は${max}文字以内で入力してください`,
  minLength: (label: string, min: number) => `${label}は${min}文字以上で入力してください`,
  invalidFormat: (label: string) => `${label}の形式が正しくありません`,
  invalidType: (label: string) => `${label}の値が正しくありません`,
}

/** 未指定（undefined）は「必須」、それ以外の型違いは「値が正しくありません」にする */
const typeError = (label: string) => (issue: { input?: unknown }) =>
  issue.input === undefined ? messages.required(label) : messages.invalidType(label)

/**
 * 文字数はコードポイント単位で数える（絵文字などの代理対を 2 文字として扱わない）。
 * `String#length` は UTF-16 コードユニット数のため、使わない。
 */
export const countChars = (value: string) => Array.from(value).length

/** 必須の文字列。空文字・空白のみは「必須」エラー。max を指定すると文字数の上限を検証する */
export function requiredString(label: string, max?: number) {
  const schema = z
    .string({ error: typeError(label) })
    .refine((value) => value.trim().length > 0, { error: messages.required(label), abort: true })

  if (max === undefined) return schema.openapi({ minLength: 1 })

  return schema
    .refine((value) => countChars(value) <= max, { error: messages.maxLength(label, max) })
    .openapi({ minLength: 1, maxLength: max })
}

/** 任意の文字列（未指定・null を許可）。値がある場合は max 以内であること */
export function optionalString(label: string, max: number) {
  return z
    .string({ error: typeError(label) })
    .refine((value) => countChars(value) <= max, { error: messages.maxLength(label, max) })
    .openapi({ maxLength: max })
    .nullish()
}

export const EMAIL_MAX_LENGTH = 255

function emailBase(label: string) {
  return z
    .string({ error: typeError(label) })
    .refine((value) => value.trim().length > 0, { error: messages.required(label), abort: true })
    .refine((value) => countChars(value) <= EMAIL_MAX_LENGTH, {
      error: messages.maxLength(label, EMAIL_MAX_LENGTH),
    })
    .pipe(z.email({ error: messages.invalidFormat(label) }))
}

const EMAIL_DOC = {
  format: 'email',
  maxLength: EMAIL_MAX_LENGTH,
  example: 'yamada@example.com',
} as const

export function emailField(label = 'メールアドレス') {
  return emailBase(label).openapi({ type: 'string', ...EMAIL_DOC })
}

/** 任意のメールアドレス（未指定・null を許可） */
export function optionalEmailField(label = 'メールアドレス') {
  return emailBase(label)
    .nullish()
    .openapi({ type: ['string', 'null'], ...EMAIL_DOC })
}

export const PASSWORD_MIN_LENGTH = 8

export function passwordField(label = 'パスワード') {
  return z
    .string({ error: typeError(label) })
    .refine((value) => value.length > 0, { error: messages.required(label), abort: true })
    .refine((value) => countChars(value) >= PASSWORD_MIN_LENGTH, {
      error: messages.minLength(label, PASSWORD_MIN_LENGTH),
    })
    .openapi({ type: 'string', format: 'password', minLength: PASSWORD_MIN_LENGTH })
}

/** 日付（YYYY-MM-DD）。存在しない日付（2025-02-30 など）は不正 */
export function dateField(label: string) {
  return z
    .string({ error: typeError(label) })
    .pipe(z.iso.date({ error: `${label}はYYYY-MM-DD形式で入力してください` }))
    .openapi({ type: 'string', format: 'date', example: '2025-07-27' })
}

/** 時刻（HH:mm、24 時間表記） */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
function timeBase(label: string) {
  return z
    .string({ error: typeError(label) })
    .regex(TIME_PATTERN, { error: `${label}はHH:mm形式で入力してください` })
}
const TIME_DOC = { pattern: TIME_PATTERN.source, example: '10:00' } as const

export function timeField(label: string) {
  return timeBase(label).openapi({ type: 'string', ...TIME_DOC })
}

/** 任意の時刻（未指定・null を許可） */
export function optionalTimeField(label: string) {
  return timeBase(label)
    .nullish()
    .openapi({ type: ['string', 'null'], ...TIME_DOC })
}

/** 日時（ISO 8601、UTC）。レスポンス用 */
export const dateTimeField = z.iso
  .datetime()
  .openapi({ type: 'string', format: 'date-time', example: '2025-07-27T09:00:00Z' })

/** ID（正の整数）。レスポンス・リクエストボディ用 */
export const idField = z.number().int().positive().openapi({ example: 1 })
