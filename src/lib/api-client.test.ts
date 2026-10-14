import { createApiClient } from '@/lib/api-client'

/** 受け取ったリクエストを記録し、指定のレスポンスを返す fetch */
function mockFetch(response: Response) {
  const calls: Request[] = []
  const fetch = async (request: Request) => {
    calls.push(request)
    return response.clone()
  }
  return { fetch, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('apiClient（OpenAPI から生成した型付きクライアント）', () => {
  it('パス・クエリを組み立てて GET する', async () => {
    const { fetch, calls } = mockFetch(
      json({ data: [], pagination: { total: 0, page: 2, per_page: 10, total_pages: 0 } }),
    )
    const client = createApiClient('http://localhost/api/v1', { fetch })

    const { data } = await client.GET('/reports', {
      params: { query: { page: 2, per_page: 10, start_date: '2025-07-01' } },
    })

    expect(calls[0]?.url).toBe(
      'http://localhost/api/v1/reports?page=2&per_page=10&start_date=2025-07-01',
    )
    expect(data?.pagination.page).toBe(2)
  })

  it('パスパラメータを埋めて、JSON ボディを POST する', async () => {
    const { fetch, calls } = mockFetch(
      json(
        { id: 1, report_id: 5, manager_id: 2, comment: 'OK', created_at: '2025-07-27T18:00:00Z' },
        201,
      ),
    )
    const client = createApiClient('http://localhost/api/v1', { fetch })

    const { data } = await client.POST('/reports/{id}/comments', {
      params: { path: { id: 5 } },
      body: { comment: 'OK' },
    })

    expect(calls[0]?.url).toBe('http://localhost/api/v1/reports/5/comments')
    expect(calls[0]?.method).toBe('POST')
    expect(await calls[0]?.json()).toEqual({ comment: 'OK' })
    expect(data?.manager_id).toBe(2)
  })

  it('エラーレスポンスは error として型付きで受け取れる', async () => {
    const { fetch } = mockFetch(
      json({ error: { code: 'DUPLICATE_REPORT', message: '同じ日付の日報が既に存在します' } }, 409),
    )
    const client = createApiClient('http://localhost/api/v1', { fetch })

    const { error, response } = await client.POST('/reports', {
      body: { report_date: '2025-07-27', problem: 'p', plan: 'p', visits: [] },
    })

    expect(response.status).toBe(409)
    expect(error?.error.code).toBe('DUPLICATE_REPORT')
  })

  it('型が合わない呼び出しはコンパイルエラーになる', async () => {
    const { fetch } = mockFetch(json({}))
    const client = createApiClient('http://localhost/api/v1', { fetch })

    // 以下は型チェック（pnpm typecheck）で検証される。実行時の結果は見ない
    await client.POST('/auth/login', {
      // @ts-expect-error password は必須
      body: { email: 'a@example.com' },
    })
    // @ts-expect-error 存在しないパスは指定できない
    await client.GET('/unknown')
  })
})
