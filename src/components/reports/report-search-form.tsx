'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'
import { FormError } from '@/components/common/form-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildReportListHref } from '@/lib/report-list-params'

/** 「全員」を表す Select の値（Radix Select は空文字の値を使えない） */
const ALL = 'all'

export const DATE_ORDER_ERROR = '終了日は開始日以降の日付を指定してください'

type ReportSearchFormProps = {
  initial: { start_date?: string; end_date?: string; sales_person_id?: string }
  /** 営業担当の選択肢。管理者のみ渡す（未指定なら絞り込みを表示しない） */
  salesPersons?: { id: number; name: string }[]
}

export function ReportSearchForm({ initial, salesPersons }: ReportSearchFormProps) {
  const router = useRouter()
  const id = useId()
  const [startDate, setStartDate] = useState(initial.start_date ?? '')
  const [endDate, setEndDate] = useState(initial.end_date ?? '')
  // 一覧にない担当者 ID（URL の手入力など）は「全員」として扱う
  const [salesPersonId, setSalesPersonId] = useState(
    initial.sales_person_id && salesPersons?.some((p) => String(p.id) === initial.sales_person_id)
      ? initial.sales_person_id
      : ALL,
  )
  const errorId = `${id}-error`

  // YYYY-MM-DD は文字列比較で大小が判定できる
  const dateOrderError = startDate && endDate && startDate > endDate ? DATE_ORDER_ERROR : null

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dateOrderError) return
    // 条件を変えたら 1 ページ目に戻す
    router.push(
      buildReportListHref({
        start_date: startDate,
        end_date: endDate,
        sales_person_id: salesPersonId === ALL ? undefined : salesPersonId,
      }),
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="検索条件" className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-start`}>期間（開始）</Label>
          <Input
            id={`${id}-start`}
            type="date"
            value={startDate}
            max={endDate || undefined}
            aria-invalid={dateOrderError ? true : undefined}
            aria-describedby={dateOrderError ? errorId : undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-44"
          />
        </div>
        <span aria-hidden className="text-muted-foreground pb-2">
          ～
        </span>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-end`}>期間（終了）</Label>
          <Input
            id={`${id}-end`}
            type="date"
            value={endDate}
            min={startDate || undefined}
            aria-invalid={dateOrderError ? true : undefined}
            aria-describedby={dateOrderError ? errorId : undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-44"
          />
        </div>

        {salesPersons && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-person`}>営業担当</Label>
            <Select value={salesPersonId} onValueChange={setSalesPersonId}>
              <SelectTrigger id={`${id}-person`} className="w-48">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全員</SelectItem>
                {salesPersons.map((person) => (
                  <SelectItem key={person.id} value={String(person.id)}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          type="submit"
          disabled={Boolean(dateOrderError)}
          aria-describedby={dateOrderError ? errorId : undefined}
        >
          検索
        </Button>
      </div>
      <FormError id={errorId} message={dateOrderError} />
    </form>
  )
}
