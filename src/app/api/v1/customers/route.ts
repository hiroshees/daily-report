import { CustomerCreateRequestSchema, CustomerListQuerySchema } from '@/schemas/customer'
import { defineRoute } from '@/server/http'
import { createCustomer, listCustomers } from '@/server/services/customer'

// 参照はログインユーザー全員（日報作成時の顧客選択に必要）、登録は管理者のみ。
// 認可は画面側ではなくここで必ず検証する
export const GET = defineRoute({
  auth: 'user',
  query: CustomerListQuerySchema,
  handler: ({ query }) => listCustomers(query),
})

export const POST = defineRoute({
  auth: 'manager',
  body: CustomerCreateRequestSchema,
  status: 201,
  handler: ({ body }) => createCustomer(body),
})
