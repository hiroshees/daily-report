import { safeRedirectPath } from '@/lib/redirect'

const LIST_PATH = '/reports'

/**
 * 日報詳細・編集画面の「戻る」先（検索条件つきの一覧 URL）を、クエリ `back` から取り出す。
 * 一覧（/reports）以外・不正な値は、オープンリダイレクトを避けるため既定の一覧にする。
 */
export function parseBackHref(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  const path = safeRedirectPath(value)
  const pathname = path.split(/[?#]/)[0]
  return pathname === LIST_PATH ? path : LIST_PATH
}

/** 戻り先を `back` として引き継いだ URL。既定の一覧に戻るだけなら付けない */
export function withBack(path: string, back: string): string {
  return back === LIST_PATH ? path : `${path}?back=${encodeURIComponent(back)}`
}
