import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// `.openapi()` を使えるようにする。スキーマ定義では必ず、ここから z を import すること
extendZodWithOpenApi(z)

// 個別にメッセージを指定していない検証エラー（型の不一致など）も日本語にする
z.config(z.locales.ja())

export { z }
