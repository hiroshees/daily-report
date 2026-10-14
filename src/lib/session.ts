export type SessionUser = {
  id: number
  name: string
  isManager: boolean
}

/**
 * ログイン中のユーザーを返す。未ログインは null。
 *
 * TODO(#7, #8): JWT の検証に置き換える。
 * それまでは開発時のみ、環境変数 DEV_STUB_USER=member|manager でログイン状態を仮定できる。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV !== 'development') return null

  switch (process.env.DEV_STUB_USER) {
    case 'member':
      return { id: 1, name: '山田太郎', isManager: false }
    case 'manager':
      return { id: 2, name: '田中部長', isManager: true }
    default:
      return null
  }
}
