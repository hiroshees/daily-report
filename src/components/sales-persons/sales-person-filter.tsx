'use client'

import { useRouter } from 'next/navigation'
import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildSalesPersonListHref,
  type SalesPersonListParams,
} from '@/lib/sales-person-list-params'

/** 「すべて」を表す Select の値（Radix Select は空文字の値を使えない） */
const ALL = 'all'

type SalesPersonFilterProps = {
  /** 現在の絞り込み条件 */
  current: SalesPersonListParams
  /** 部署の選択肢（全担当者から重複を除いたもの） */
  departments: string[]
}

/** 部署・権限での絞り込み。選ぶとすぐに一覧へ反映する */
export function SalesPersonFilter({ current, departments }: SalesPersonFilterProps) {
  const router = useRouter()
  const id = useId()
  // 一覧にない部署（URL の手入力など）で絞り込み中は、その値を選択肢に加えて表示する
  // （「すべて」と表示したまま 0 件になる食い違いを防ぐ）
  const department = current.department ?? ALL
  const options =
    current.department && !departments.includes(current.department)
      ? [...departments, current.department]
      : departments

  function change(next: SalesPersonListParams) {
    router.push(buildSalesPersonListHref({ ...current, ...next }))
  }

  return (
    <div role="group" aria-label="絞り込み" className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-department`}>部署</Label>
        <Select
          value={department}
          onValueChange={(value) => change({ department: value === ALL ? undefined : value })}
        >
          <SelectTrigger id={`${id}-department`} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべて</SelectItem>
            {options.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-role`}>権限</Label>
        <Select
          value={current.is_manager ?? ALL}
          onValueChange={(value) =>
            change({ is_manager: value === ALL ? undefined : (value as 'true' | 'false') })
          }
        >
          <SelectTrigger id={`${id}-role`} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべて</SelectItem>
            <SelectItem value="false">一般</SelectItem>
            <SelectItem value="true">管理者</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
