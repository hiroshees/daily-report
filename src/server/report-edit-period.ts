import { getReportEditLimitDays } from '@/server/env'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 編集可能期間を過ぎているか。作成日時から REPORT_EDIT_LIMIT_DAYS 日（既定 7 日）で判定する。
 * 更新 API と編集画面で同じ判定を使う。
 * TODO(#27): 編集可能期間は未確定のため暫定
 */
export function isReportEditExpired(createdAt: Date, now: number = Date.now()): boolean {
  return now - createdAt.getTime() > getReportEditLimitDays() * DAY_MS
}
