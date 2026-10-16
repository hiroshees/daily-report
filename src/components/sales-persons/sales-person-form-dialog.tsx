'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SalesPersonForm } from '@/components/sales-persons/sales-person-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type SalesPersonFormDialogProps = {
  /** 編集する担当者（一覧の行の値）。未指定なら新規登録 */
  person?: { id: number; name: string; email: string; department: string; is_manager: boolean }
  isSelf?: boolean
  /** ダイアログを開くボタン */
  trigger: ReactNode
}

/** 営業担当者の登録・編集ダイアログ。保存後は閉じて、一覧を再取得する */
export function SalesPersonFormDialog({ person, isSelf, trigger }: SalesPersonFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = person !== undefined

  function saved() {
    toast.success(isEdit ? '営業担当者を更新しました' : '営業担当者を登録しました')
    setOpen(false)
    router.refresh()
  }

  /** 編集中に、対象が別の管理者に削除されていた場合。再送信しても同じなので、閉じて一覧を最新にする */
  function notFound() {
    toast.error('この営業担当者は存在しません（削除された可能性があります）')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '営業担当者の編集' : '営業担当者の新規登録'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '営業担当者の情報を編集します。' : '新しい営業担当者を登録します。'}
          </DialogDescription>
        </DialogHeader>
        {/* 閉じるとアンマウントされ、開くたびに入力内容がリセットされる */}
        <SalesPersonForm
          person={person}
          isSelf={isSelf}
          onSaved={saved}
          onCancel={() => setOpen(false)}
          onNotFound={notFound}
        />
      </DialogContent>
    </Dialog>
  )
}
