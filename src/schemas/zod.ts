import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// `.openapi()` を使えるようにする。スキーマ定義では必ず、ここから z を import すること
extendZodWithOpenApi(z)

export { z }
