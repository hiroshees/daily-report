import { IdParamSchema } from '@/schemas/common'
import { SalesPersonUpdateRequestSchema } from '@/schemas/sales-person'
import { defineRoute } from '@/server/http'
import {
  deleteSalesPerson,
  getSalesPerson,
  updateSalesPerson,
} from '@/server/services/sales-person'

export const GET = defineRoute({
  auth: 'manager',
  params: IdParamSchema,
  handler: ({ params }) => getSalesPerson(params.id),
})

export const PUT = defineRoute({
  auth: 'manager',
  params: IdParamSchema,
  body: SalesPersonUpdateRequestSchema,
  handler: ({ params, body }) => updateSalesPerson(params.id, body),
})

export const DELETE = defineRoute({
  auth: 'manager',
  params: IdParamSchema,
  status: 204,
  handler: ({ params, user }) => deleteSalesPerson(params.id, user.id),
})
