// @vitest-environment node
import { z } from '@/schemas/zod'
import { ApiError, ERROR_MESSAGE, ERROR_STATUS, type ErrorCode } from '@/server/errors'
import { defineRoute, MAX_BODY_BYTES, type RouteContext } from '@/server/http'
import { getSession } from '@/server/session'

vi.mock('@/server/session', () => ({ getSession: vi.fn() }))

const member = {
  id: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  department: '営業1課',
  isManager: false,
}
const manager = {
  id: 2,
  name: '田中部長',
  email: 'tanaka@example.com',
  department: '営業1課',
  isManager: true,
}

type Failure = 'missing' | 'expired' | 'invalid'
/** ログイン状態を差し替える（null は未ログイン、文字列は認証に失敗した理由） */
const loginAs = (user: typeof member | Failure | null) =>
  vi
    .mocked(getSession)
    .mockResolvedValue(
      user === null || typeof user === 'string'
        ? { ok: false, reason: user ?? 'missing' }
        : { ok: true, user, token: { jti: 'jti', expiresAt: new Date('2099-01-01') } },
    )

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Route = (request: Request, context: RouteContext) => Promise<Response>

/** パスパラメータなしのルートに渡す、空の context */
const NO_PARAMS: RouteContext = { params: Promise.resolve({}) }

function get(route: Route, path = '/api/v1/x', headers: HeadersInit = {}) {
  return route(new Request(`http://localhost${path}`, { headers }), NO_PARAMS)
}
function send(
  route: Route,
  body: BodyInit | null,
  headers: HeadersInit = { 'Content-Type': 'application/json' },
) {
  return route(
    new Request('http://localhost/api/v1/x', { method: 'POST', body, headers }),
    NO_PARAMS,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  loginAs(member)
})

describe('エラーレスポンスの形式（doc/API_SCHEME.md 2.3・2.4・4 章）', () => {
  it.each(Object.entries(ERROR_STATUS) as [ErrorCode, number][])(
    '%s → HTTP %i、{ error: { code, message } } 形式',
    async (code, status) => {
      const route = defineRoute({
        handler: () => {
          throw new ApiError(code)
        },
      })

      const response = await get(route)

      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: { code, message: ERROR_MESSAGE[code] } })
    },
  )

  it('主要なステータス（400/401/403/404/409/500）が仕様どおりの対応になっている', () => {
    expect(ERROR_STATUS).toMatchObject({
      VALIDATION_ERROR: 400,
      AUTH_UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      DUPLICATE_REPORT: 409,
      RESOURCE_IN_USE: 409,
      INTERNAL_ERROR: 500,
    })
  })

  it('メッセージと details を指定できる', async () => {
    const route = defineRoute({
      handler: () => {
        throw new ApiError('VALIDATION_ERROR', '日付が不正です', [
          { field: 'report_date', message: '不正' },
        ])
      },
    })

    expect(await (await get(route)).json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '日付が不正です',
        details: [{ field: 'report_date', message: '不正' }],
      },
    })
  })
})

describe('成功レスポンス', () => {
  it('200: ハンドラの戻り値を JSON で返す', async () => {
    const route = defineRoute({ handler: () => ({ ok: true }) })

    const response = await get(route)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('201: status を指定できる', async () => {
    const route = defineRoute({ status: 201, handler: () => ({ id: 1 }) })

    const response = await get(route)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: 1 })
  })

  it('204: ボディなし', async () => {
    const route = defineRoute({ status: 204, handler: () => undefined })

    const response = await get(route)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })

  it('非同期のハンドラも扱える', async () => {
    const route = defineRoute({ handler: async () => ({ n: 1 }) })
    expect(await (await get(route)).json()).toEqual({ n: 1 })
  })

  it('Response を返した場合はそのまま返し、共通ヘッダーを付ける', async () => {
    const route = defineRoute({
      handler: () => new Response('created', { status: 202, headers: { 'X-Custom': '1' } }),
    })

    const response = await get(route, '/api/v1/x', { 'X-Request-Id': 'abc-123' })

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('created')
    expect(response.headers.get('X-Custom')).toBe('1')
    expect(response.headers.get('X-Request-Id')).toBe('abc-123')
  })
})

describe('共通ヘッダー（X-Request-Id・Content-Type）', () => {
  const routes = {
    '200': defineRoute({ handler: () => ({}) }),
    '204': defineRoute({ status: 204, handler: () => undefined }),
    '400': defineRoute({ query: z.object({ n: z.coerce.number() }), handler: () => ({}) }),
    '401': defineRoute({
      handler: () => {
        throw new ApiError('AUTH_UNAUTHORIZED')
      },
    }),
    '500': defineRoute({
      handler: () => {
        throw new Error('boom')
      },
    }),
  }

  it.each(Object.entries(routes))('HTTP %s のレスポンスにも付与される', async (_status, route) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await get(route, '/api/v1/x?n=abc')

    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(response.headers.get('X-Request-Id')).toMatch(UUID)
  })

  it('受信した X-Request-Id を引き継ぐ', async () => {
    const route = defineRoute({ handler: ({ requestId }) => ({ requestId }) })

    const response = await get(route, '/api/v1/x', { 'X-Request-Id': 'client-req_01:a.b' })

    expect(response.headers.get('X-Request-Id')).toBe('client-req_01:a.b')
    expect(await response.json()).toEqual({ requestId: 'client-req_01:a.b' })
  })

  it('無ければ UUID を生成し、リクエストごとに異なる', async () => {
    const route = defineRoute({ handler: () => ({}) })

    const ids = await Promise.all(
      [get(route), get(route)].map(async (p) => (await p).headers.get('X-Request-Id')),
    )

    expect(ids[0]).toMatch(UUID)
    expect(ids[0]).not.toBe(ids[1])
  })

  it.each([
    ['空白を含む', 'a b'],
    ['長すぎる', 'a'.repeat(129)],
    ['非 ASCII 文字', 'réq'],
    ['記号', 'a;b<script>'],
  ])('不正な形式（%s）は引き継がず、UUID を生成する', async (_name, value) => {
    const route = defineRoute({ handler: () => ({}) })

    const response = await get(route, '/api/v1/x', { 'X-Request-Id': value })

    expect(response.headers.get('X-Request-Id')).toMatch(UUID)
  })
})

describe('認証・認可', () => {
  it('既定でログイン必須。未ログインは 401 で、ハンドラは呼ばれない', async () => {
    loginAs(null)
    const handler = vi.fn()

    const response = await get(defineRoute({ handler }))

    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('AUTH_UNAUTHORIZED')
    expect(handler).not.toHaveBeenCalled()
  })

  it('ログイン済みならユーザーがハンドラに渡される', async () => {
    const route = defineRoute({ handler: ({ user }) => ({ id: user.id }) })
    expect(await (await get(route)).json()).toEqual({ id: 1 })
  })

  it("auth: 'manager' は一般ユーザーなら 403、管理者なら実行できる", async () => {
    const route = defineRoute({ auth: 'manager', handler: ({ user }) => ({ name: user.name }) })

    const forbidden = await get(route)
    expect(forbidden.status).toBe(403)
    expect((await forbidden.json()).error.code).toBe('FORBIDDEN')

    loginAs(manager)
    expect(await (await get(route)).json()).toEqual({ name: '田中部長' })
  })

  it("auth: 'manager' でも未ログインは 401", async () => {
    loginAs(null)
    expect((await get(defineRoute({ auth: 'manager', handler: () => ({}) }))).status).toBe(401)
  })

  it("auth: 'none' は認証不要で、セッションも参照しない", async () => {
    loginAs(null)
    const route = defineRoute({ auth: 'none', handler: ({ user }) => ({ user }) })

    expect(await (await get(route)).json()).toEqual({ user: null })
    expect(getSession).not.toHaveBeenCalled()
  })

  it('認証は検証より先: 未ログインなら不正な入力でも 401（検証内容を教えない）', async () => {
    loginAs(null)
    const route = defineRoute({ body: z.object({ a: z.string() }), handler: () => ({}) })

    const response = await send(route, '{}')

    expect(response.status).toBe(401)
    expect((await response.json()).error.details).toBeUndefined()
  })

  it('トークンの期限切れは AUTH_TOKEN_EXPIRED、それ以外の無効は AUTH_UNAUTHORIZED（どちらも 401）', async () => {
    const route = defineRoute({ handler: () => ({}) })

    loginAs('expired')
    const expired = await get(route)
    expect(expired.status).toBe(401)
    expect((await expired.json()).error).toEqual({
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'トークンの有効期限が切れています',
    })

    for (const reason of ['invalid', 'missing'] as const) {
      loginAs(reason)
      const response = await get(route)
      expect(response.status).toBe(401)
      expect((await response.json()).error.code).toBe('AUTH_UNAUTHORIZED')
    }
  })

  it('ハンドラには Authorization / Cookie を含むリクエストのヘッダーで認証する', async () => {
    const route = defineRoute({ handler: () => ({}) })

    await get(route, '/api/v1/x', { Authorization: 'Bearer abc' })

    const headers = vi.mocked(getSession).mock.calls[0]![0]
    expect(headers.get('authorization')).toBe('Bearer abc')
  })
})

describe('入力の検証（400 VALIDATION_ERROR）', () => {
  const body = z.object({
    problem: z.string({ error: '課題・相談は必須項目です' }),
    visits: z.array(
      z.object({
        visit_content: z.string().max(3, { error: '訪問内容は3文字以内で入力してください' }),
      }),
    ),
  })

  it('ボディの検証エラーを details[{ field, message }] で返す', async () => {
    const route = defineRoute({ body, handler: () => ({}) })

    const response = await send(route, JSON.stringify({ visits: [{ visit_content: 'あいうえ' }] }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力値が不正です',
        details: [
          { field: 'problem', message: '課題・相談は必須項目です' },
          { field: 'visits.0.visit_content', message: '訪問内容は3文字以内で入力してください' },
        ],
      },
    })
  })

  it('検証済みの値（型変換・既定値）がハンドラに渡される', async () => {
    const route = defineRoute({
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
      params: z.object({ id: z.coerce.number().int().positive() }),
      handler: ({ query, params }) => ({ page: query.page, id: params.id }),
    })

    const response = await route(new Request('http://localhost/api/v1/x?page=3'), {
      params: Promise.resolve({ id: '12' }),
    })

    expect(await response.json()).toEqual({ page: 3, id: 12 })
  })

  it('params のスキーマがあるのに値が渡されなければ 400', async () => {
    const route = defineRoute({ params: z.object({ id: z.coerce.number() }), handler: () => ({}) })
    expect((await get(route)).status).toBe(400)
  })

  it('クエリの検証エラー', async () => {
    const route = defineRoute({
      query: z.object({ page: z.coerce.number().int().min(1) }),
      handler: () => ({}),
    })

    const response = await get(route, '/api/v1/x?page=0')

    expect(response.status).toBe(400)
    expect((await response.json()).error.details[0].field).toBe('page')
  })

  it('パスの ID が数値でなければ 400', async () => {
    const route = defineRoute({
      params: z.object({ id: z.coerce.number().int().positive() }),
      handler: () => ({}),
    })

    const response = await route(new Request('http://localhost/api/v1/reports/abc'), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).error.details[0].field).toBe('id')
  })

  it('個別にメッセージを指定していない検証エラーも日本語になる', async () => {
    const route = defineRoute({ body: z.object({ n: z.number() }), handler: () => ({}) })

    const response = await send(route, JSON.stringify({ n: 'x' }))

    expect((await response.json()).error.details[0].message).toMatch(/[ぁ-んァ-ヶ一-龥]/)
  })

  it('ハンドラ内で投げられた ZodError も 400 にする', async () => {
    const route = defineRoute({
      handler: () => {
        z.string().parse(123)
      },
    })
    expect((await get(route)).status).toBe(400)
  })

  it('JSON として不正なボディは 400', async () => {
    const route = defineRoute({ body: z.object({}), handler: () => ({}) })

    const response = await send(route, '{not json')

    expect(response.status).toBe(400)
    expect((await response.json()).error.message).toContain('JSON')
  })

  it('空のボディは 400', async () => {
    const route = defineRoute({ body: z.object({}), handler: () => ({}) })
    expect((await send(route, '')).status).toBe(400)
    expect((await send(route, '  \n')).status).toBe(400)
  })

  it('Content-Type が application/json でなければ 400', async () => {
    const route = defineRoute({ body: z.object({}), handler: () => ({}) })

    expect((await send(route, '{}', { 'Content-Type': 'text/plain' })).status).toBe(400)
    expect((await send(route, '{}', {})).status).toBe(400)
    expect(
      (await send(route, '{}', { 'Content-Type': 'application/json; charset=utf-8' })).status,
    ).toBe(200)
  })
})

describe(`リクエストボディの上限（${MAX_BODY_BYTES} バイト = 1MB）`, () => {
  const route = defineRoute({ body: z.object({ text: z.string() }), handler: () => ({ ok: true }) })
  /** ちょうど n バイトの JSON ボディ（ASCII） */
  const jsonOfBytes = (n: number) => {
    const overhead = JSON.stringify({ text: '' }).length
    return JSON.stringify({ text: 'a'.repeat(n - overhead) })
  }

  it('上限ちょうどは受け付ける', async () => {
    const text = jsonOfBytes(MAX_BODY_BYTES)
    expect(new TextEncoder().encode(text).byteLength).toBe(MAX_BODY_BYTES)

    expect((await send(route, text)).status).toBe(200)
  })

  it('上限を 1 バイト超えると 400（メッセージに 1MB を含む）', async () => {
    const response = await send(route, jsonOfBytes(MAX_BODY_BYTES + 1))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('1MB'),
    })
  })

  it('文字数ではなくバイト数で数える（日本語は 1 文字 3 バイト）', async () => {
    const text = JSON.stringify({ text: 'あ'.repeat(Math.floor(MAX_BODY_BYTES / 3)) })
    expect(text.length).toBeLessThan(MAX_BODY_BYTES) // 文字数では上限以内

    expect((await send(route, text)).status).toBe(400)
  })

  it('Content-Length が大きければ、読み込まずに拒否する', async () => {
    const response = await send(route, '{"text":"a"}', {
      'Content-Type': 'application/json',
      'Content-Length': String(MAX_BODY_BYTES + 1),
    })

    expect(response.status).toBe(400)
  })

  it('Content-Length が無いストリームでも、上限を超えたら中断する', async () => {
    const chunk = new TextEncoder().encode('a'.repeat(MAX_BODY_BYTES / 2 + 1))
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk)
        controller.enqueue(chunk)
        controller.close()
      },
    })

    const response = await route(
      new Request('http://localhost/api/v1/x', {
        method: 'POST',
        body: stream,
        headers: { 'Content-Type': 'application/json' },
        duplex: 'half',
      } as RequestInit),
      NO_PARAMS,
    )

    expect(response.status).toBe(400)
  })
})

describe('想定外の例外（500 INTERNAL_ERROR）', () => {
  it('内容・スタックトレースをレスポンスに出さず、ログにだけ残す', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const route = defineRoute({
      handler: () => {
        throw new Error('DB 接続文字列 postgresql://user:secret@host/db が不正')
      },
    })

    const response = await get(route, '/api/v1/x', { 'X-Request-Id': 'req-500' })
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' },
    })
    expect(text).not.toContain('secret')
    expect(text).not.toContain('stack')
    expect(text).not.toContain('at ')

    // 例外の詳細ログとアクセスログの 2 行
    expect(consoleError).toHaveBeenCalledTimes(2)
    const log = JSON.parse(consoleError.mock.calls[0]![0] as string)
    expect(log).toMatchObject({ level: 'error', requestId: 'req-500' })
    expect(log.message).toContain('secret')
    expect(log.stack).toContain('Error')
  })

  it('Error 以外が投げられても 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const route = defineRoute({
      handler: () => {
        throw 'string error'
      },
    })

    expect((await get(route)).status).toBe(500)
  })

  it('ApiError は想定内のエラーなのでログに出さない', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const route = defineRoute({
      handler: () => {
        throw new ApiError('NOT_FOUND')
      },
    })

    await get(route)

    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('CSRF 対策（Origin の検証）', () => {
  const route = defineRoute({ handler: () => ({ ok: true }) })
  const post = (headers: HeadersInit) =>
    route(new Request('http://localhost:3000/api/v1/x', { method: 'POST', headers }), NO_PARAMS)

  it('Origin が自分のホストと違う状態変更リクエストは 403', async () => {
    const response = await post({ Origin: 'https://evil.example.com', Host: 'localhost:3000' })

    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe('FORBIDDEN')
  })

  it('Origin が同じホストなら OK', async () => {
    expect((await post({ Origin: 'http://localhost:3000', Host: 'localhost:3000' })).status).toBe(
      200,
    )
  })

  it('プロキシ経由は X-Forwarded-Host と比較する', async () => {
    const headers = { Origin: 'https://app.example.com', Host: 'internal:3000' }

    expect((await post({ ...headers, 'X-Forwarded-Host': 'app.example.com' })).status).toBe(200)
    expect((await post({ ...headers, 'X-Forwarded-Host': 'other.example.com' })).status).toBe(403)
  })

  it('Origin が無いリクエスト（ブラウザ以外）は対象外', async () => {
    expect((await post({ Host: 'localhost:3000' })).status).toBe(200)
  })

  it.each(['null', 'not a url'])('不正な Origin（%s）は 403', async (origin) => {
    expect((await post({ Origin: origin, Host: 'localhost:3000' })).status).toBe(403)
  })

  it('GET は Origin が違っても検証しない（状態を変更しないため）', async () => {
    const response = await route(
      new Request('http://localhost:3000/api/v1/x', {
        headers: { Origin: 'https://evil.example.com', Host: 'localhost:3000' },
      }),
      NO_PARAMS,
    )
    expect(response.status).toBe(200)
  })

  it('CSRF の拒否は認証より先に行う（他サイトからのリクエストでセッションを参照しない）', async () => {
    await post({ Origin: 'https://evil.example.com', Host: 'localhost:3000' })
    expect(getSession).not.toHaveBeenCalled()
  })
})

describe('キャッシュ', () => {
  it('全レスポンスに Cache-Control: no-store を付ける', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = defineRoute({ handler: () => ({}) })
    const bad = defineRoute({
      handler: () => {
        throw new Error('x')
      },
    })

    expect((await get(ok)).headers.get('Cache-Control')).toBe('no-store')
    expect((await get(bad)).headers.get('Cache-Control')).toBe('no-store')
  })
})
