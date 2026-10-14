'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { SessionUser } from '@/lib/session'

const CurrentUserContext = createContext<SessionUser | null>(null)

/**
 * ログイン中のユーザーを、Client Component から使えるようにする。
 * ユーザーはサーバー側（`getSessionUser`）で確認済みのものを渡すため、画面側で改めて取得しない。
 */
export function CurrentUserProvider({
  user,
  children,
}: {
  user: SessionUser
  children: ReactNode
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
}

/** ログイン中のユーザー。`CurrentUserProvider`（認証後のレイアウト）の外で使うとエラー */
export function useCurrentUser(): SessionUser {
  const user = useContext(CurrentUserContext)
  if (!user) throw new Error('useCurrentUser は CurrentUserProvider の内側で使ってください')
  return user
}
