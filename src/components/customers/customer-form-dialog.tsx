'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { CustomerForm } from '@/components/customers/customer-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import { toCustomerFormValues, type CustomerFormValues } from '@/schemas/customer-form'

type CustomerFormDialogProps = {
  /** 編集する顧客の ID。未指定なら新規登録 */
  customerId?: number
  /** ダイアログを開くボタン */
  trigger: ReactNode
}

/** 顧客の登録・編集ダイアログ。編集では、開いたときに最新の顧客情報（住所を含む）を取得する */
export function CustomerFormDialog({ customerId, trigger }: CustomerFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = customerId !== undefined

  function saved() {
    toast.success(isEdit ? '顧客を更新しました' : '顧客を登録しました')
    setOpen(false)
    // 一覧を再取得して反映する
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '顧客の編集' : '顧客の新規登録'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '顧客情報を編集します。' : '新しい顧客を登録します。'}
          </DialogDescription>
        </DialogHeader>
        {/* 閉じるとアンマウントされ、開くたびに入力内容・取得結果がリセットされる */}
        {isEdit ? (
          <EditLoader customerId={customerId} onSaved={saved} onCancel={() => setOpen(false)} />
        ) : (
          <CustomerForm onSaved={saved} onCancel={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; values: CustomerFormValues }

function EditLoader({
  customerId,
  onSaved,
  onCancel,
}: {
  customerId: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, response } = await apiClient.GET('/customers/{id}', {
          params: { path: { id: customerId } },
        })
        if (cancelled) return
        setState(
          response.ok && data
            ? { status: 'ready', values: toCustomerFormValues(data) }
            : { status: 'error' },
        )
      } catch {
        if (!cancelled) setState({ status: 'error' })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [customerId, attempt])

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-muted h-10 animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 text-center">
        <p role="alert" className="text-destructive text-sm">
          顧客情報を取得できませんでした
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          再読み込み
        </Button>
      </div>
    )
  }

  return (
    <CustomerForm
      customerId={customerId}
      initialValues={state.values}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}
