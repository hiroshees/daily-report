import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi'
import { CurrentUserSchema, LoginRequestSchema, LoginResponseSchema } from '@/schemas/auth'
import {
  CommentCreateRequestSchema,
  CommentCreateResponseSchema,
  CommentSchema,
} from '@/schemas/comment'
import { ErrorResponseSchema, IdParamSchema, listOf, paginated } from '@/schemas/common'
import {
  CustomerCreateRequestSchema,
  CustomerCreateResponseSchema,
  CustomerListQuerySchema,
  CustomerSchema,
  CustomerSummarySchema,
  CustomerUpdateRequestSchema,
  CustomerUpdateResponseSchema,
} from '@/schemas/customer'
import {
  ReportCreateRequestSchema,
  ReportCreateResponseSchema,
  ReportDetailSchema,
  ReportListItemSchema,
  ReportListQuerySchema,
  ReportUpdateRequestSchema,
  ReportUpdateResponseSchema,
} from '@/schemas/report'
import {
  SalesPersonCreateRequestSchema,
  SalesPersonCreateResponseSchema,
  SalesPersonDetailSchema,
  SalesPersonListQuerySchema,
  SalesPersonSchema,
  SalesPersonUpdateRequestSchema,
  SalesPersonUpdateResponseSchema,
} from '@/schemas/sales-person'
import { z } from '@/schemas/zod'

/**
 * API のベースパス（Route Handler の配置先）。
 * doc/API_SCHEME.md のベース URL は `https://api.sales-report.example.com/v1` だが、
 * Next.js の Route Handler で同一オリジン配信する前提で暫定的に `/api/v1` とする（#27 A6）。
 */
export const API_BASE_PATH = '/api/v1'

type Responses = RouteConfig['responses']

const jsonBody = <T extends z.ZodType>(schema: T) => ({
  content: { 'application/json': { schema } },
})
const ok = <T extends z.ZodType>(description: string, schema: T, status: 200 | 201 = 200) => ({
  [status]: { description, ...jsonBody(schema) },
})
const noContent = (description: string) => ({ 204: { description } })

/** エラーレスポンス（形式は共通。コードは doc/API_SCHEME.md 4章） */
const errorResponses = {
  400: '入力値が不正（VALIDATION_ERROR）',
  401: '認証が必要（AUTH_UNAUTHORIZED / AUTH_TOKEN_EXPIRED）',
  403: '権限がない（FORBIDDEN / EDIT_PERIOD_EXPIRED）',
  404: 'リソースが存在しない（NOT_FOUND）',
  409: '競合（DUPLICATE_REPORT / DUPLICATE_EMAIL / RESOURCE_IN_USE）',
} as const
const errors = (...statuses: (keyof typeof errorResponses)[]): Responses =>
  Object.fromEntries(
    statuses.map((status) => [
      status,
      { description: errorResponses[status], ...jsonBody(ErrorResponseSchema) },
    ]),
  )

const secured: { security: Record<string, string[]>[] } = {
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
}

export function createRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry()

  // ブラウザは HttpOnly Cookie、API クライアントは Bearer のどちらでも認証できる
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'session',
    description: 'ログイン時に設定される HttpOnly Cookie（ブラウザ用）',
  })
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'ログインのレスポンスの token（API クライアント用）',
  })

  // ---- 認証 ----
  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['認証'],
    summary: 'ログイン',
    description:
      'ログイン認証を行い、アクセストークン（JWT）を発行する。ブラウザ向けに HttpOnly Cookie（session）も設定する。メールアドレスの不在とパスワード違いは区別しない（どちらも 401）',
    security: [],
    request: { body: { required: true, ...jsonBody(LoginRequestSchema) } },
    responses: { ...ok('ログイン成功', LoginResponseSchema), ...errors(400, 401) },
  })
  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['認証'],
    summary: 'ログアウト',
    description:
      'トークンを失効させ、Cookie を削除する。ログイン状態でなくても 204 を返す（何度呼んでもよい）',
    security: [...secured.security, {}],
    responses: noContent('ログアウト成功'),
  })
  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['認証'],
    summary: 'ログインユーザー情報取得',
    ...secured,
    responses: { ...ok('ログインユーザー', CurrentUserSchema), ...errors(401) },
  })

  // ---- 日報 ----
  registry.registerPath({
    method: 'get',
    path: '/reports',
    tags: ['日報'],
    summary: '日報一覧取得',
    ...secured,
    request: { query: ReportListQuerySchema },
    responses: {
      ...ok('日報一覧', paginated(ReportListItemSchema)),
      ...errors(400, 401),
    },
  })
  registry.registerPath({
    method: 'get',
    path: '/reports/{id}',
    tags: ['日報'],
    summary: '日報詳細取得',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...ok('日報詳細', ReportDetailSchema), ...errors(400, 401, 404) },
  })
  registry.registerPath({
    method: 'post',
    path: '/reports',
    tags: ['日報'],
    summary: '日報作成',
    description: '日報と訪問記録を同時に作成する。同一担当者・同一日付の日報は 1 件まで（409）',
    ...secured,
    request: { body: { required: true, ...jsonBody(ReportCreateRequestSchema) } },
    responses: {
      ...ok('作成した日報', ReportCreateResponseSchema, 201),
      ...errors(400, 401, 409),
    },
  })
  registry.registerPath({
    method: 'put',
    path: '/reports/{id}',
    tags: ['日報'],
    summary: '日報更新',
    description:
      '作成者本人のみ（管理者も他人の日報は不可）。訪問記録は差分更新（id あり=更新、id なし=新規、送られなかった既存分=削除。他日報の id は 400）。作成から一定期間（環境変数 REPORT_EDIT_LIMIT_DAYS、既定 7 日）を過ぎると 403 EDIT_PERIOD_EXPIRED',
    ...secured,
    request: {
      params: IdParamSchema,
      body: { required: true, ...jsonBody(ReportUpdateRequestSchema) },
    },
    responses: { ...ok('更新した日報', ReportUpdateResponseSchema), ...errors(400, 401, 403, 404) },
  })
  registry.registerPath({
    method: 'delete',
    path: '/reports/{id}',
    tags: ['日報'],
    summary: '日報削除',
    description: '作成者本人のみ。訪問記録・コメントも削除される',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...noContent('削除成功'), ...errors(401, 403, 404) },
  })

  // ---- コメント ----
  registry.registerPath({
    method: 'get',
    path: '/reports/{id}/comments',
    tags: ['コメント'],
    summary: 'コメント一覧取得',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...ok('コメント一覧', listOf(CommentSchema)), ...errors(401, 404) },
  })
  registry.registerPath({
    method: 'post',
    path: '/reports/{id}/comments',
    tags: ['コメント'],
    summary: 'コメント作成',
    description: '管理者のみ',
    ...secured,
    request: {
      params: IdParamSchema,
      body: { required: true, ...jsonBody(CommentCreateRequestSchema) },
    },
    responses: {
      ...ok('作成したコメント', CommentCreateResponseSchema, 201),
      ...errors(400, 401, 403, 404),
    },
  })

  // ---- 営業担当者（全て管理者のみ）----
  registry.registerPath({
    method: 'get',
    path: '/sales-persons',
    tags: ['営業担当者'],
    summary: '営業担当者一覧取得',
    description: '管理者のみ',
    ...secured,
    request: { query: SalesPersonListQuerySchema },
    responses: { ...ok('営業担当者一覧', listOf(SalesPersonSchema)), ...errors(401, 403) },
  })
  registry.registerPath({
    method: 'get',
    path: '/sales-persons/{id}',
    tags: ['営業担当者'],
    summary: '営業担当者詳細取得',
    description: '管理者のみ',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...ok('営業担当者詳細', SalesPersonDetailSchema), ...errors(401, 403, 404) },
  })
  registry.registerPath({
    method: 'post',
    path: '/sales-persons',
    tags: ['営業担当者'],
    summary: '営業担当者作成',
    description: '管理者のみ。メールアドレスが重複する場合は 409',
    ...secured,
    request: { body: { required: true, ...jsonBody(SalesPersonCreateRequestSchema) } },
    responses: {
      ...ok('作成した営業担当者', SalesPersonCreateResponseSchema, 201),
      ...errors(400, 401, 403, 409),
    },
  })
  registry.registerPath({
    method: 'put',
    path: '/sales-persons/{id}',
    tags: ['営業担当者'],
    summary: '営業担当者更新',
    description: '管理者のみ',
    ...secured,
    request: {
      params: IdParamSchema,
      body: { required: true, ...jsonBody(SalesPersonUpdateRequestSchema) },
    },
    responses: {
      ...ok('更新した営業担当者', SalesPersonUpdateResponseSchema),
      ...errors(400, 401, 403, 404, 409),
    },
  })
  registry.registerPath({
    method: 'delete',
    path: '/sales-persons/{id}',
    tags: ['営業担当者'],
    summary: '営業担当者削除',
    description:
      '管理者のみ。日報・コメントから参照されている場合、自分自身、最後の管理者は削除できない（409）',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...noContent('削除成功'), ...errors(401, 403, 404, 409) },
  })

  // ---- 顧客（参照は全員、変更は管理者のみ）----
  registry.registerPath({
    method: 'get',
    path: '/customers',
    tags: ['顧客'],
    summary: '顧客一覧取得',
    ...secured,
    request: { query: CustomerListQuerySchema },
    responses: { ...ok('顧客一覧', paginated(CustomerSummarySchema)), ...errors(400, 401) },
  })
  registry.registerPath({
    method: 'get',
    path: '/customers/{id}',
    tags: ['顧客'],
    summary: '顧客詳細取得',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...ok('顧客詳細', CustomerSchema), ...errors(401, 404) },
  })
  registry.registerPath({
    method: 'post',
    path: '/customers',
    tags: ['顧客'],
    summary: '顧客作成',
    description: '管理者のみ',
    ...secured,
    request: { body: { required: true, ...jsonBody(CustomerCreateRequestSchema) } },
    responses: {
      ...ok('作成した顧客', CustomerCreateResponseSchema, 201),
      ...errors(400, 401, 403),
    },
  })
  registry.registerPath({
    method: 'put',
    path: '/customers/{id}',
    tags: ['顧客'],
    summary: '顧客更新',
    description: '管理者のみ',
    ...secured,
    request: {
      params: IdParamSchema,
      body: { required: true, ...jsonBody(CustomerUpdateRequestSchema) },
    },
    responses: {
      ...ok('更新した顧客', CustomerUpdateResponseSchema),
      ...errors(400, 401, 403, 404),
    },
  })
  registry.registerPath({
    method: 'delete',
    path: '/customers/{id}',
    tags: ['顧客'],
    summary: '顧客削除',
    description: '管理者のみ。訪問記録から参照されている場合は削除できない（409）',
    ...secured,
    request: { params: IdParamSchema },
    responses: { ...noContent('削除成功'), ...errors(401, 403, 404, 409) },
  })

  return registry
}

/** OpenAPI ドキュメントを組み立てる（Zod スキーマが唯一の情報源） */
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(createRegistry().definitions)

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: '営業日報システム API',
      version: '1.0.0',
      description:
        '営業担当者が日報を作成し、上長がコメントするための API。仕様は doc/API_SCHEME.md。',
    },
    servers: [{ url: API_BASE_PATH }],
  })
}
