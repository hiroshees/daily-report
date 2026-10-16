'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type CustomerOption = { id: number; company_name: string }

type CustomerComboboxProps = {
  id?: string
  value: number | undefined
  onChange: (customerId: number) => void
  /** 初期値（value）に対応する会社名。編集画面などで既存の顧客を表示するために渡す */
  selectedLabel?: string
  // FormControl が付与する値をそのまま受け取る
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
}

const SEARCH_DEBOUNCE_MS = 250
// 100 社想定のため、検索で絞り込んだ上位だけを表示する（超過分は絞り込みを案内する）
const OPTION_LIMIT = 20

/** 顧客を検索して選ぶコンボボックス。選択肢は API で検索する（全件を事前に持たない） */
export function CustomerCombobox({
  id,
  value,
  onChange,
  selectedLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [total, setTotal] = useState(0)
  // この画面で選んだ顧客（値は ID のみのため、会社名を表示用に保持する）
  const [picked, setPicked] = useState<CustomerOption | null>(null)
  const selectedName = picked && picked.id === value ? picked.company_name : selectedLabel

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // デバウンス待ちの間も「検索中」とし、前の結果と「該当なし」が混ざらないようにする
    setLoading(true)
    setFailed(false)
    const timer = setTimeout(async () => {
      try {
        const { data, response } = await apiClient.GET('/customers', {
          params: { query: { search: search.trim() || undefined, per_page: OPTION_LIMIT } },
        })
        if (cancelled) return
        if (!response.ok || !data) {
          // 古い候補を選べてしまわないよう、失敗時は候補を空にする
          setOptions([])
          setTotal(0)
          setFailed(true)
        } else {
          setOptions(data.data.map(({ id, company_name }) => ({ id, company_name })))
          setTotal(data.pagination.total)
        }
      } catch {
        if (cancelled) return
        setOptions([])
        setTotal(0)
        setFailed(true)
      }
      setLoading(false)
    }, SEARCH_DEBOUNCE_MS)

    // 入力が続く間・閉じたときは、古いリクエストの結果を捨てる
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, search])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // 開くたびに前回の検索状態を持ち越さない。閉じたときは進行中の検索表示を残さない
    setSearch('')
    setOptions([])
    setTotal(0)
    setFailed(false)
    setLoading(false)
  }

  function select(option: CustomerOption) {
    setPicked(option)
    onChange(option.id)
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
          className={cn(
            'w-full justify-between font-normal',
            value === undefined && 'text-muted-foreground',
          )}
        >
          <span className="truncate">
            {value === undefined ? '選択してください' : (selectedName ?? `顧客ID: ${value}`)}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) space-y-2 p-2" align="start">
        <Input
          autoFocus
          placeholder="会社名・担当者名で検索"
          aria-label="顧客を検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {/* 矢印キー操作を持つ listbox ではなく、Tab で移動できる単純なボタン一覧にする */}
        <ul aria-label="顧客" className="max-h-60 overflow-y-auto">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                aria-current={option.id === value ? 'true' : undefined}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                onClick={() => select(option)}
              >
                <Check
                  className={cn('size-4', option.id === value ? 'opacity-100' : 'opacity-0')}
                  aria-hidden
                />
                <span className="truncate">{option.company_name}</span>
              </button>
            </li>
          ))}
        </ul>
        {failed && (
          <p role="alert" className="text-destructive px-2 text-sm">
            顧客の取得に失敗しました
          </p>
        )}
        {!failed && !loading && options.length === 0 && (
          <p className="text-muted-foreground px-2 text-sm">該当する顧客がありません</p>
        )}
        {!loading && !failed && total > options.length && (
          <p className="text-muted-foreground px-2 text-sm">
            他 {total - options.length} 件あります。会社名・担当者名で絞り込んでください
          </p>
        )}
        {loading && <p className="text-muted-foreground px-2 text-sm">検索中…</p>}
      </PopoverContent>
    </Popover>
  )
}
