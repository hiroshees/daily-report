'use client'

import { useRouter } from 'next/navigation'
import { useState, type MouseEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/common/form-error'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

const GENERIC_ERROR = '営業担当者の削除に失敗しました。時間をおいてもう一度お試しください。'

type SalesPersonDeleteButtonProps = {
  personId: number
  name: string
  /** ログインユーザー本人か。自分自身は削除できない（API でも拒否される） */
  isSelf: boolean
}

/** 営業担当者の削除（確認ダイアログつき）。日報・コメントから参照されている担当者や最後の管理者は 409 で削除されない */
export function SalesPersonDeleteButton({ personId, name, isSelf }: SalesPersonDeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isSelf) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        aria-label={`${name}を削除（自分自身は削除できません）`}
        title="自分自身は削除できません"
      >
        削除
      </Button>
    )
  }

  async function onDelete(event: MouseEvent) {
    // 失敗したときにダイアログを閉じてしまわないよう、自動で閉じる動作を止める
    event.preventDefault()
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const { response, error: apiError } = await apiClient.DELETE('/sales-persons/{id}', {
        params: { path: { id: personId } },
      })

      if (response.ok) {
        toast.success('営業担当者を削除しました')
        setOpen(false)
        router.refresh()
        return
      }

      // 別の管理者が先に削除していた場合。行は一覧から消えるため、通知して一覧を再取得する
      if (response.status === 404) {
        toast.info('この営業担当者は既に削除されています')
        setOpen(false)
        router.refresh()
        return
      }
      setError(apiError?.error.message ?? GENERIC_ERROR)
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // 削除の通信中は閉じさせない（完了後のエラー表示やトーストが宙に浮かないようにする）
        if (deleting) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`${name}を削除`}>
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>営業担当者を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{name}
            」を削除します。この操作は取り消せません。日報やコメントがある担当者、最後の管理者は削除できません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={deleting}>
            {deleting ? '削除中…' : '削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
