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
  invalid?: boolean
  'aria-describedby'?: string
}

const SEARCH_DEBOUNCE_MS = 250
// 100 社想定のため、検索で絞り込んだ上位だけを表示する
const OPTION_LIMIT = 20

/** 顧客を検索して選ぶコンボボックス。選択肢は API で検索する（全件を事前に持たない） */
export function CustomerCombobox({
  id,
  value,
  onChange,
  invalid,
  'aria-describedby': describedBy,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // 選択済みの会社名（値は ID のみのため、表示用に保持する）
  const [selectedName, setSelectedName] = useState<string | null>(null)

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
          setFailed(true)
        } else {
          setOptions(data.data.map(({ id, company_name }) => ({ id, company_name })))
        }
      } catch {
        if (cancelled) return
        setOptions([])
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
    setFailed(false)
    setLoading(false)
  }

  function select(option: CustomerOption) {
    setSelectedName(option.company_name)
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
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
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
        <ul role="listbox" aria-label="顧客" className="max-h-60 overflow-y-auto">
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
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
        {loading && <p className="text-muted-foreground px-2 text-sm">検索中…</p>}
      </PopoverContent>
    </Popover>
  )
}
