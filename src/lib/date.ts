import { format, parseISO } from 'date-fns'

/** 業務上の「今日」は日本時間で判定する（サーバーのタイムゾーンに左右されない）。TODO(#27): 作成可能日付・タイムゾーンの確定 */
export function todayInJst(now: Date = new Date()): string {
  // sv-SE ロケールは YYYY-MM-DD 形式になる
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now)
}

/** 日報の日付表示。`M/d` 形式、基準日（今日）と年が違う場合のみ年も表示する */
export function formatReportDate(date: string, today: string = todayInJst()): string {
  const target = parseISO(date)
  const sameYear = date.slice(0, 4) === today.slice(0, 4)
  return format(target, sameYear ? 'M/d' : 'yyyy/M/d')
}

/** 日付の表示。`yyyy/MM/dd` 形式（画面定義書の日報作成・詳細画面の表記） */
export function formatFullDate(date: string): string {
  return format(parseISO(date), 'yyyy/MM/dd')
}
