import { ForbiddenView } from '@/components/common/error-view'

/** 権限のない画面にアクセスしたときの遷移先（ガードは #8 で実装） */
export default function ForbiddenPage() {
  return <ForbiddenView />
}
