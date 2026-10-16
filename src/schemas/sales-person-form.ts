import { emailField, passwordField, requiredString } from '@/schemas/fields'
import type { SalesPersonCreateRequest, SalesPersonUpdateRequest } from '@/schemas/sales-person'
import { DEPARTMENT_MAX_LENGTH, NAME_MAX_LENGTH } from '@/schemas/sales-person'
import { z } from '@/schemas/zod'

/**
 * 営業担当者フォーム（登録・編集ダイアログ）の入力値の検証。
 * 文言・文字数の上限は API のスキーマ（sales-person.ts）と同じ定義を使う。
 * パスワードは登録時のみ必須（編集 API はパスワードを受け取らない。変更方法は #27 で未確定）。
 */
const baseFields = {
  name: requiredString('氏名', NAME_MAX_LENGTH),
  email: emailField(),
  department: requiredString('部署', DEPARTMENT_MAX_LENGTH),
  is_manager: z.boolean(),
}

export const SalesPersonCreateFormSchema = z.object({ ...baseFields, password: passwordField() })

/** 編集では password を使わない（常に空文字） */
export const SalesPersonEditFormSchema = z.object({ ...baseFields, password: z.string() })

export type SalesPersonFormValues = z.infer<typeof SalesPersonCreateFormSchema>

export const EMPTY_SALES_PERSON: SalesPersonFormValues = {
  name: '',
  email: '',
  password: '',
  department: '',
  is_manager: false,
}

/** 登録 API のリクエスト。氏名・部署・メールの前後の空白を除く（パスワードはそのまま） */
export function toCreateRequest(values: SalesPersonFormValues): SalesPersonCreateRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password,
    department: values.department.trim(),
    is_manager: values.is_manager,
  }
}

/** 更新 API のリクエスト（パスワードは含まない） */
export function toUpdateRequest(values: SalesPersonFormValues): SalesPersonUpdateRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    department: values.department.trim(),
    is_manager: values.is_manager,
  }
}
