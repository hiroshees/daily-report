import {
  ADDRESS_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  CONTACT_PERSON_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  type CustomerCreateRequest,
} from '@/schemas/customer'
import { countChars, EMAIL_MAX_LENGTH, messages, requiredString } from '@/schemas/fields'
import { z } from '@/schemas/zod'

/**
 * 顧客フォーム（登録・編集ダイアログ）の入力値の検証。
 * 文字数の上限は API のスキーマ（customer.ts）の定数を共有する。任意項目は未入力（空文字）を許可する。
 * 会社名以外の必須/任意は未確定（#27）のため、現状は任意としている。
 */
const optionalText = (label: string, max: number) =>
  z.string().refine((value) => countChars(value.trim()) <= max, {
    error: messages.maxLength(label, max),
  })

export const CustomerFormSchema = z.object({
  company_name: requiredString('会社名', COMPANY_NAME_MAX_LENGTH),
  contact_person: optionalText('担当者名', CONTACT_PERSON_MAX_LENGTH),
  phone: optionalText('電話番号', PHONE_MAX_LENGTH),
  email: optionalText('メールアドレス', EMAIL_MAX_LENGTH).refine(
    (value) => value.trim() === '' || z.email().safeParse(value.trim()).success,
    { error: messages.invalidFormat('メールアドレス') },
  ),
  address: optionalText('住所', ADDRESS_MAX_LENGTH),
})

export type CustomerFormValues = z.infer<typeof CustomerFormSchema>

export const EMPTY_CUSTOMER: CustomerFormValues = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
}

/** 登録・更新 API のリクエスト。前後の空白を除き、未入力の任意項目は null（未設定）にする */
export function toCustomerRequest(values: CustomerFormValues): CustomerCreateRequest {
  const optional = (value: string) => value.trim() || null
  return {
    company_name: values.company_name.trim(),
    contact_person: optional(values.contact_person),
    phone: optional(values.phone),
    email: optional(values.email),
    address: optional(values.address),
  }
}

/** API の顧客（未設定は null）をフォームの初期値にする */
export function toCustomerFormValues(customer: {
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
}): CustomerFormValues {
  return {
    company_name: customer.company_name,
    contact_person: customer.contact_person ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
  }
}
