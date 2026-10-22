'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  /** the list's localized path */
  action: string
  /** the current ?ara */
  query: string
  /** the query a search keeps (the province and the page size) */
  keep: Record<string, string>
  /** the list without the search, for "Aramayı temizle" without JS */
  clearHref: string
  maxLength: number
  labels: { label: string; placeholder: string; button: string; clear: string }
}

const WAIT_MS = 300

/** "Sıramı bul" (2026-10-22): the list follows the box while typing, 300 ms after the last key, the address changing in
 *  place (no history entry per letter). Enter and Bul search at once; without JS the form's GET does it. */
export function RankingsSearch({ action, query, keep, clearHref, maxLength, labels }: Props) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // A search still waiting must not fire on the page the visitor has left
  useEffect(() => () => clearTimeout(timer.current), [])

  const search = (value: string) => {
    clearTimeout(timer.current)
    const ara = value.trim().slice(0, maxLength)
    if (ara === query) return
    const params = new URLSearchParams({ ...keep, ...(ara ? { ara } : {}) }).toString()
    router.replace(params ? `${action}?${params}` : action, { scroll: false })
  }

  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        search(input.current?.value ?? '')
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="rankings-search" className="t-label mb-2 block text-fg-2">
          {labels.label}
        </label>
        {query && (
          <a
            href={clearHref}
            onClick={(e) => {
              e.preventDefault()
              if (input.current) input.current.value = ''
              search('')
            }}
            className="text-sm font-semibold text-brand-ink underline"
          >
            {labels.clear}
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={input}
          id="rankings-search"
          type="search"
          name="ara"
          defaultValue={query}
          maxLength={maxLength}
          placeholder={labels.placeholder}
          autoComplete="off"
          onChange={(e) => {
            const value = e.target.value
            clearTimeout(timer.current)
            timer.current = setTimeout(() => search(value), WAIT_MS)
          }}
          className="h-11 min-w-0 flex-1 border border-line bg-bg px-3 text-fg focus:border-fg"
        />
        {Object.entries(keep).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button type="submit" className="btn btn-brand">
          {labels.button}
        </button>
      </div>
    </form>
  )
}
