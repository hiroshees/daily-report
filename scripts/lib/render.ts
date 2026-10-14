import openapiTS, { astToString } from 'openapi-typescript'
import type { buildOpenApiDocument } from '../../src/schemas/openapi'

type OpenApiDocument = ReturnType<typeof buildOpenApiDocument>

/** openapi.json の内容（末尾改行あり） */
export function renderOpenApiJson(document: OpenApiDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

const TYPES_HEADER = `/**
 * このファイルは自動生成されます。直接編集しないでください。
 * 再生成: pnpm api:generate（元: src/schemas/、出力元: openapi.json）
 */

`

/** openapi-typescript で生成した型定義（paths / components / operations） */
export async function renderApiTypes(document: OpenApiDocument): Promise<string> {
  // openapi-typescript は入力を変更することがあるため、複製を渡す
  const ast = await openapiTS(structuredClone(document) as Parameters<typeof openapiTS>[0])
  return TYPES_HEADER + astToString(ast)
}
