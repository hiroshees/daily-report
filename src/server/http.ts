import { randomUUID } from 'node:crypto'
import { ZodError, type z } from 'zod'
import type { SessionUser } from '@/lib/session'
import { assertManager, requireAuth } from '@/server/auth'
import { ApiError, ERROR_MESSAGE, type ErrorDetail } from '@/server/errors'
import { log, requestLogFields, type LogFields } from '@/server/logger'

/** リクエストボディの上限（doc/API_SCHEME.md 5 章: 最大 1MB） */
export const MAX_BODY_BYTES = 1024 * 1024

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
/** 受け取った X-Request-Id として許可する形式（ログ汚染・ヘッダー注入の防止） */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

type AuthLevel = 'none' | 'user' | 'manager'
type Output<S> = S extends z.ZodType ? z.output<S> : undefined

/**
 * Next.js が Route Handler の第 2 引数に渡す値。
 * Next.js の型検査（next build）は第 2 引数が必須の型であることを要求するため、`?` を付けない。
 * （実行時は、`params` を使わないルートでも動くよう、省略されても扱える）
 */
export type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> }

type RouteConfig<
  P extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  B extends z.ZodType | undefined,
  A extends AuthLevel,
> = {
  /** 認証。省略時は `user`（ログイン必須）。公開 API は明示的に `none` を指定する */
  auth?: A
  /** パスパラメータ（例: `{id}`）のスキーマ */
  params?: P
  /** クエリ文字列のスキーマ */
  query?: Q
  /** JSON ボディのスキーマ */
  body?: B
  /** 成功時のステータス。省略時は 200。204 の場合はボディなし */
  status?: 200 | 201 | 204
  /** マスタ変更など、成功時に監査ログへ記録するイベント名（例: `customer.create`） */
  auditEvent?: string
  handler: (context: {
    user: A extends 'none' ? null : SessionUser
    params: Output<P>
    query: Output<Q>
    body: Output<B>
    request: Request
    requestId: string
    /** 監査ログ（認証イベント・マスタ変更など）を記録する。パスワードやトークンは渡さないこと */
    audit: (event: string, fields?: LogFields) => void
  }) => unknown
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF 対策。Cookie でログインするため、他サイトから送られた状態変更リクエストを拒否する。
 * ブラウザは `Origin` を付けて送るので、自分のホストと違えば 403。
 * `Origin` が無いリクエスト（API クライアントなど、ブラウザ以外）は対象外（Cookie の自動送信が起きない）。
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return

  const origin = request.headers.get('origin')
  if (!origin) return

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  let originHost: string | null = null
  try {
    originHost = new URL(origin).host
  } catch {
    // 不正な Origin（"null" を含む）は拒否する
  }
  if (!host || originHost !== host) throw new ApiError('FORBIDDEN')
}

/** 受信した X-Request-Id を引き継ぐ。無い・不正な形式なら UUID を生成する */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id')
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID()
}

/** 全レスポンス共通のヘッダー（Content-Type と X-Request-Id） */
function responseHeaders(requestId: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  if (!headers.has('Content-Type')) headers.set('Content-Type', JSON_CONTENT_TYPE)
  // ユーザー情報やトークンを含みうるため、ブラウザや中継サーバーにキャッシュさせない
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')
  headers.set('X-Request-Id', requestId)
  return headers
}

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(requestId) })
}

/** Zod の検証エラーを `details[{ field, message }]` にする（field は `visits.0.visit_content` 形式） */
export function toErrorDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
}

function errorResponse(error: unknown, requestId: string): Response {
  const apiError =
    error instanceof ApiError
      ? error
      : error instanceof ZodError
        ? new ApiError('VALIDATION_ERROR', undefined, toErrorDetails(error))
        : null

  if (apiError) {
    return jsonResponse(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          ...(apiError.details && { details: apiError.details }),
        },
      },
      apiError.status,
      requestId,
    )
  }

  // 想定外の例外。内容（スタックトレース含む）はレスポンスに出さず、ログにだけ残す
  log('error', error instanceof Error ? error.message : String(error), {
    requestId,
    stack: error instanceof Error ? error.stack : undefined,
  })
  return jsonResponse(
    { error: { code: 'INTERNAL_ERROR', message: ERROR_MESSAGE.INTERNAL_ERROR } },
    500,
    requestId,
  )
}

const bodyTooLarge = () =>
  new ApiError('VALIDATION_ERROR', 'リクエストボディが大きすぎます（最大1MB）')

/** ボディを上限付きで読み込む（Content-Length が無い・偽りの場合でも上限を超えたら中断する） */
async function readBodyText(request: Request): Promise<string> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw bodyTooLarge()
  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > MAX_BODY_BYTES) {
      await reader.cancel()
      throw bodyTooLarge()
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw new ApiError('VALIDATION_ERROR', 'Content-Type は application/json を指定してください')
  }

  const text = await readBodyText(request)
  if (text.trim() === '') {
    throw new ApiError('VALIDATION_ERROR', 'リクエストボディが空です')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'リクエストボディが JSON として不正です')
  }
}

function parse<S extends z.ZodType | undefined>(schema: S, input: unknown): Output<S> {
  return (schema ? schema.parse(input) : undefined) as Output<S>
}

/**
 * Route Handler を定義する。共通仕様（doc/API_SCHEME.md 2 章）をまとめて面倒を見る。
 *
 * - 認証（既定はログイン必須）→ パス/クエリ/ボディの検証（失敗は 400 `VALIDATION_ERROR`）→ ハンドラ
 * - `ApiError` / 検証エラー / 想定外の例外を、エラーレスポンス `{ error: { code, message, details? } }` に変換
 * - 全レスポンスに `X-Request-Id` と `Content-Type: application/json; charset=utf-8` を付与
 *
 * ```ts
 * export const POST = defineRoute({
 *   auth: 'manager',
 *   body: CustomerCreateRequestSchema,
 *   status: 201,
 *   handler: async ({ body }) => createCustomer(body),
 * })
 * ```
 */
export function defineRoute<
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  A extends AuthLevel = 'user',
>(config: RouteConfig<P, Q, B, A>) {
  return async function route(request: Request, context: RouteContext): Promise<Response> {
    const requestId = resolveRequestId(request)
    const startedAt = performance.now()
    const base = requestLogFields(request, requestId)
    let userId: number | null = null
    let errorCode: string | undefined
    const audit = (event: string, fields: LogFields = {}) =>
      log('info', event, { ...base, userId, ...fields, audit: true })

    const response = await handle()
    // 全 API リクエストのアクセスログ。ボディ・Cookie・トークンは含めない
    log(response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info', 'access', {
      ...base,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      userId,
      ...(errorCode && { errorCode }),
    })
    // 権限エラーは監査として明示的に記録する
    if (errorCode === 'FORBIDDEN') audit('auth.forbidden', { status: response.status })
    return response

    async function handle(): Promise<Response> {
      try {
        assertSameOrigin(request)

        // 認証を先に行い、未認証の相手にスキーマの詳細（検証エラー）を教えない
        const auth = config.auth ?? 'user'
        const user = auth === 'none' ? null : await requireAuth(request)
        // 権限エラー（403）の監査ログにユーザーIDを残すため、管理者判定の前に記録する
        userId = user?.id ?? null
        if (auth === 'manager') assertManager(user!)

        const params = parse(config.params as P, await context?.params)
        const query = parse(
          config.query as Q,
          Object.fromEntries(new URL(request.url).searchParams.entries()),
        )
        const body = config.body ? parse(config.body as B, await readJsonBody(request)) : undefined

        const result = await config.handler({
          user: user as A extends 'none' ? null : SessionUser,
          params,
          query,
          body: body as Output<B>,
          request,
          requestId,
          audit,
        })
        if (config.auditEvent) {
          audit(config.auditEvent, { targetId: (params as { id?: number } | undefined)?.id })
        }

        if (result instanceof Response) {
          return new Response(result.body, {
            status: result.status,
            headers: responseHeaders(requestId, result.headers),
          })
        }

        const status = config.status ?? 200
        if (status === 204) {
          return new Response(null, { status, headers: responseHeaders(requestId) })
        }
        return jsonResponse(result, status, requestId)
      } catch (error) {
        if (error instanceof ApiError) errorCode = error.code
        return errorResponse(error, requestId)
      }
    }
  }
}
