import { writeFileSync } from 'node:fs'
import { buildOpenApiDocument } from '../src/schemas/openapi'
import { renderApiTypes } from './lib/render'

const OUTPUT = 'src/lib/api-schema.d.ts'

async function main() {
  writeFileSync(OUTPUT, await renderApiTypes(buildOpenApiDocument()))
  console.log(`生成しました: ${OUTPUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
