import createClient, { type ClientOptions } from 'openapi-fetch'
import type { paths } from '@/lib/api-schema'
import { API_BASE_PATH } from '@/schemas/openapi'

/**
 * 型付き API クライアント（型は openapi.json から生成: pnpm api:generate）。
 * 既定の baseUrl は相対パスのため、ブラウザ（Client Component）から使う。
 * Server Component / Server Action から呼ぶ場合は、絶対 URL を渡して作る。
 */
export function createApiClient(
  baseUrl: string = API_BASE_PATH,
  options: Omit<ClientOptions, 'baseUrl'> = {},
) {
  return createClient<paths>({ baseUrl, ...options })
}

export const apiClient = createApiClient()
