import { ForbiddenView } from '@/components/common/error-view'
import { requireManagerPage } from '@/server/page-auth'

export default async function Page() {
  // 管理者専用。ナビのリンクを隠すだけでは URL 直打ちを防げないため、ページでも確認する
  const { allowed } = await requireManagerPage()
  if (!allowed) return <ForbiddenView />

  // TODO(#21): 画面を実装する
  return <h1 className="text-xl font-bold">営業担当者管理</h1>
}
