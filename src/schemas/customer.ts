import { PaginationQuerySchema } from '@/schemas/common'
import {
  dateTimeField,
  idField,
  optionalEmailField,
  optionalString,
  requiredString,
} from '@/schemas/fields'
import { z } from '@/schemas/zod'

export const CustomerListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({ description: '会社名/担当者名で検索（部分一致）' }),
})

export const CustomerSummarySchema = z
  .object({
    id: idField,
    company_name: z.string().openapi({ example: 'ABC商事' }),
    contact_person: z.string().nullable().openapi({ example: '佐藤一郎' }),
    phone: z.string().nullable().openapi({ example: '03-1234-5678' }),
    email: z.string().nullable().openapi({ example: 'sato@abc.co.jp' }),
  })
  .openapi('CustomerSummary')

export const CustomerSchema = CustomerSummarySchema.extend({
  address: z.string().nullable().openapi({ example: '東京都千代田区...' }),
  created_at: dateTimeField,
  updated_at: dateTimeField,
}).openapi('Customer')

// 会社名以外の必須/任意は未確定（#27）のため、現状は任意としている（DB も同様）
const customerBody = {
  company_name: requiredString('会社名', 200),
  contact_person: optionalString('担当者名', 100),
  phone: optionalString('電話番号', 30),
  email: optionalEmailField(),
  address: optionalString('住所', 500),
}

export const CustomerCreateRequestSchema = z.object(customerBody).openapi('CustomerCreateRequest')
export const CustomerUpdateRequestSchema = z.object(customerBody).openapi('CustomerUpdateRequest')

export const CustomerCreateResponseSchema = CustomerSchema.omit({ updated_at: true }).openapi(
  'CustomerCreateResponse',
)
export const CustomerUpdateResponseSchema = CustomerSchema.omit({ created_at: true }).openapi(
  'CustomerUpdateResponse',
)

export type CustomerCreateRequest = z.infer<typeof CustomerCreateRequestSchema>
export type CustomerUpdateRequest = z.infer<typeof CustomerUpdateRequestSchema>
