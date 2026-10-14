import { readFileSync } from 'node:fs'
import { ERROR_CODES } from '@/schemas/common'
import { ApiError, ERROR_MESSAGE, ERROR_STATUS } from '@/server/errors'

/** doc/API_SCHEME.md 4 章の表（コード | HTTP | 説明） */
function documentedErrors() {
  const doc = readFileSync('doc/API_SCHEME.md', 'utf8')
  const section = doc.slice(doc.indexOf('## 4. エラーコード一覧'))
  return [...section.matchAll(/^\| ([A-Z_]+) +\| (\d{3}) +\| (.+?) +\|$/gm)].map((m) => ({
    code: m[1]!,
    status: Number(m[2]),
    message: m[3]!,
  }))
}

describe('エラー定義', () => {
  it('全てのエラーコードにステータスとメッセージがある', () => {
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ERROR_CODES].sort())
    expect(Object.keys(ERROR_MESSAGE).sort()).toEqual([...ERROR_CODES].sort())
  })

  it('doc/API_SCHEME.md のエラーコード表（コード・HTTP・メッセージ）と一致する', () => {
    const documented = documentedErrors()
    expect(documented).toHaveLength(ERROR_CODES.length)

    for (const { code, status, message } of documented) {
      expect(ERROR_STATUS[code as keyof typeof ERROR_STATUS], code).toBe(status)
      expect(ERROR_MESSAGE[code as keyof typeof ERROR_MESSAGE], code).toBe(message)
    }
  })

  it('使用するステータスは仕様の HTTP ステータス（400/401/403/404/409/500）のみ', () => {
    expect(new Set(Object.values(ERROR_STATUS))).toEqual(new Set([400, 401, 403, 404, 409, 500]))
  })
})

describe('ApiError', () => {
  it('code からステータスと既定メッセージが決まる', () => {
    const error = new ApiError('DUPLICATE_REPORT')

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      code: 'DUPLICATE_REPORT',
      status: 409,
      message: '同じ日付の日報が既に存在します',
    })
  })
})
