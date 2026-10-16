import { IdParamSchema } from '@/schemas/common'
import { CustomerUpdateRequestSchema } from '@/schemas/customer'
import { defineRoute } from '@/server/http'
import { deleteCustomer, getCustomer, updateCustomer } from '@/server/services/customer'

export const GET = defineRoute({
  auth: 'user',
  params: IdParamSchema,
  handler: ({ params }) => getCustomer(params.id),
})

export const PUT = defineRoute({
  auth: 'manager',
  auditEvent: 'customer.update',
  params: IdParamSchema,
  body: CustomerUpdateRequestSchema,
  handler: ({ params, body }) => updateCustomer(params.id, body),
})

export const DELETE = defineRoute({
  auth: 'manager',
  auditEvent: 'customer.delete',
  params: IdParamSchema,
  status: 204,
  handler: ({ params }) => deleteCustomer(params.id),
})
