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

const GENERIC_ERROR = '顧客の削除に失敗しました。時間をおいてもう一度お試しください。'

/** 顧客の削除（確認ダイアログつき）。参照中の顧客は 409 のメッセージを表示し、削除しない */
export function CustomerDeleteButton({
  customerId,
  companyName,
}: {
  customerId: number
  companyName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete(event: MouseEvent) {
    // 失敗したときにダイアログを閉じてしまわないよう、自動で閉じる動作を止める
    event.preventDefault()
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const { response, error: apiError } = await apiClient.DELETE('/customers/{id}', {
        params: { path: { id: customerId } },
      })

      if (response.ok) {
        toast.success('顧客を削除しました')
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
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`${companyName}を削除`}>
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>顧客を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{companyName}
            」を削除します。この操作は取り消せません。日報の訪問記録で使われている顧客は削除できません。
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
