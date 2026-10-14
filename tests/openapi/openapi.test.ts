// @vitest-environment node
import { readFileSync } from 'node:fs'
import SwaggerParser from '@apidevtools/swagger-parser'
import { renderApiTypes, renderOpenApiJson } from '../../scripts/lib/render'
import { ERROR_CODES } from '@/schemas/common'
import { buildOpenApiDocument } from '@/schemas/openapi'

const document = buildOpenApiDocument()
const apiScheme = readFileSync('doc/API_SCHEME.md', 'utf8')

/** doc/API_SCHEME.md 1.2 のエンドポイント一覧から `METHOD /path` を取り出す */
function documentedEndpoints(): string[] {
  return [...apiScheme.matchAll(/^\| [^|]+\| (GET|POST|PUT|DELETE) +\| (\/\S+) +\|/gm)].map(
    (match) => `${match[1]} ${match[2]}`,
  )
}

/** doc/API_SCHEME.md 4 章のエラーコード一覧 */
function documentedErrorCodes(): string[] {
  const section = apiScheme.slice(apiScheme.indexOf('## 4. エラーコード一覧'))
  return [...section.matchAll(/^\| ([A-Z_]+) +\|/gm)].map((match) => match[1]!)
}

describe('OpenAPI ドキュメント', () => {
  it('OpenAPI 3.1 として妥当（$ref が全て解決できる）', async () => {
    await expect(SwaggerParser.validate(structuredClone(document) as never)).resolves.toBeDefined()
  })

  it('doc/API_SCHEME.md のエンドポイントを過不足なく含む', () => {
    const implemented = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
      Object.keys(item as object)
        .filter((key) => ['get', 'post', 'put', 'delete'].includes(key))
        .map((method) => `${method.toUpperCase()} ${path}`),
    )

    expect(documentedEndpoints()).toHaveLength(20)
    expect(implemented.sort()).toEqual(documentedEndpoints().sort())
  })

  it('エラーコードが doc/API_SCHEME.md と一致する', () => {
    expect([...ERROR_CODES].sort()).toEqual(documentedErrorCodes().sort())
  })

  it('ログイン以外は Bearer 認証が必須', () => {
    const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
      Object.entries(item as Record<string, { security?: unknown[] }>).map(
        ([method, operation]) => ({
          key: `${method.toUpperCase()} ${path}`,
          security: operation.security,
        }),
      ),
    )

    for (const { key, security } of operations) {
      if (key === 'POST /auth/login') expect(security).toEqual([])
      else expect(security, key).toEqual([{ bearerAuth: [] }])
    }
  })
})

describe('生成物が最新であること（`pnpm api:generate` を実行し忘れていない）', () => {
  it('openapi.json が src/schemas の内容と一致する', () => {
    expect(readFileSync('openapi.json', 'utf8')).toBe(renderOpenApiJson(document))
  })

  it('src/lib/api-schema.d.ts が src/schemas の内容と一致する', async () => {
    expect(readFileSync('src/lib/api-schema.d.ts', 'utf8')).toBe(await renderApiTypes(document))
  })
})
