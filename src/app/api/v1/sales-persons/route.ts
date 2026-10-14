import { SalesPersonCreateRequestSchema, SalesPersonListQuerySchema } from '@/schemas/sales-person'
import { defineRoute } from '@/server/http'
import { createSalesPerson, listSalesPersons } from '@/server/services/sales-person'

// 認可は `auth: 'manager'`（requireManager）でここで必ず検証する。画面側の表示制御には依存しない
export const GET = defineRoute({
  auth: 'manager',
  query: SalesPersonListQuerySchema,
  handler: ({ query }) => listSalesPersons(query),
})

export const POST = defineRoute({
  auth: 'manager',
  body: SalesPersonCreateRequestSchema,
  status: 201,
  handler: ({ body }) => createSalesPerson(body),
})
