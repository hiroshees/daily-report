import { defineRoute } from '@/server/http'
import { toCurrentUser } from '@/server/services/auth'

export const GET = defineRoute({
  handler: ({ user }) => toCurrentUser(user),
})
