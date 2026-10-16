import type { SessionUser } from '@/lib/session'
import { ApiError } from '@/server/errors'
import { getSession } from '@/server/session'

/** ログイン必須。未ログイン・無効なトークンは 401、期限切れは `AUTH_TOKEN_EXPIRED`（401） */
export async function requireAuth(request: Request): Promise<SessionUser> {
  const session = await getSession(request.headers)
  if (!session.ok) {
    throw new ApiError(session.reason === 'expired' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_UNAUTHORIZED')
  }
  return session.user
}

/** 管理者のみ。未ログインなら 401、一般ユーザーなら 403 */
export async function requireManager(request: Request): Promise<SessionUser> {
  const user = await requireAuth(request)
  assertManager(user)
  return user
}

/** 管理者でなければ 403 */
export function assertManager(user: Pick<SessionUser, 'isManager'>): void {
  if (!user.isManager) throw new ApiError('FORBIDDEN')
}

/**
 * 日報を編集・削除できるのは作成者本人のみ（管理者でも他人の日報は不可。CLAUDE.md 5.1）。
 * 編集可能期間のチェックは別途行う（#14）。
 */
export function canEditReport(user: Pick<SessionUser, 'id'>, report: { salesPersonId: number }) {
  return user.id === report.salesPersonId
}

/** 日報の編集権限がなければ 403 */
export function assertCanEditReport(
  user: Pick<SessionUser, 'id'>,
  report: { salesPersonId: number },
): void {
  if (!canEditReport(user, report)) throw new ApiError('FORBIDDEN')
}
