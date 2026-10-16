'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildCustomerListHref } from '@/lib/customer-list-params'

/** 会社名/担当者名の検索。Enter キーでも実行できる（form の submit） */
export function CustomerSearchForm({ initial }: { initial?: string }) {
  const router = useRouter()
  const id = useId()
  const [keyword, setKeyword] = useState(initial ?? '')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // 条件を変えたら 1 ページ目に戻す
    router.push(buildCustomerListHref({ search: keyword }))
  }

  return (
    <form onSubmit={onSubmit} role="search" aria-label="顧客検索" className="flex items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={id}>検索</Label>
        <Input
          id={id}
          type="search"
          value={keyword}
          placeholder="会社名・担当者名"
          onChange={(event) => setKeyword(event.target.value)}
          className="w-72"
        />
      </div>
      <Button type="submit">検索</Button>
    </form>
  )
}
