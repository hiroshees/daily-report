import type { z } from 'zod'

/** 検証結果を `[項目のパス, メッセージ]` の一覧にする（成功時は空） */
export function issuesOf<T extends z.ZodType>(schema: T, input: unknown): [string, string][] {
  const result = schema.safeParse(input)
  if (result.success) return []
  return result.error.issues.map((issue) => [issue.path.join('.'), issue.message])
}
