import { requirePageUser } from '@/server/page-auth'

export default async function Page() {
  // レイアウトの確認に頼らず、ページでも確認する（TODO(#16): 日報一覧を実装する）
  await requirePageUser()

  return <h1 className="text-xl font-bold">日報一覧</h1>
}
