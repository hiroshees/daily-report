import { writeFileSync } from 'node:fs'
import { buildOpenApiDocument } from '../src/schemas/openapi'
import { renderOpenApiJson } from './lib/render'

const OUTPUT = 'openapi.json'

writeFileSync(OUTPUT, renderOpenApiJson(buildOpenApiDocument()))
console.log(`生成しました: ${OUTPUT}`)
