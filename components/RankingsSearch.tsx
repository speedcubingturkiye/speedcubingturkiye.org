'use client'

import { createContext, useContext, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { RankingsPager, RankingsTable } from '@/components/RankingsTable'
import type { ListKind, ListRow } from '@/lib/rankings-list'
import { filterRows, listQuery, MAX_QUERY, pageCount, type ListParams } from '@/lib/rankings-view'

type Scope = {
  /** what the box holds */
  live: string
  /** the box's query, trimmed: the one `found` answers (a key behind the box while the table catches up) */
  q: string
  /** the rows the browser found, while the box is ahead of the page the server drew; null otherwise */
  found: ListRow[] | null
  params: ListParams
  pathname: string
  change: (value: string) => void
  submit: () => void
  load: () => void
}

const SearchScope = createContext<Scope | null>(null)

// The address (and with it the server's page) follows the box this long after the last key
const SYNC_MS = 400

type ScopeProps = {
  /** this list's search data (app/api/siralamalar) */
  source: string
  /** this list's path, unlocalized (next-intl's router adds the locale) */
  pathname: string
  /** the page the server drew */
  params: ListParams
  children: ReactNode
}

/**
 * "Sıramı bul" without waiting (2026-10-22): the list's every row comes once, on the box's first focus, and each key
 * narrows them in the browser. The address follows SYNC_MS after the last key (router.replace, no history entry per
 * letter), so the server's page, its links and its count catch up; until then the browser's rows show, the very rows
 * the server then sends. While the data is not in yet, or could not come, the server's page stays.
 */
export function RankingsSearchScope({ source, pathname, params, children }: ScopeProps) {
  const router = useRouter()
  const [live, setLive] = useState(params.query)
  const [data, setData] = useState<{ source: string; rows: ListRow[] } | null>(null)
  const fetching = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // The box's address still waiting must not overwrite a newer step: a link (a page of the results, another list), a
  // new province, the browser's back, or a page the visitor has left
  useEffect(() => {
    const cancel = (e: Event) => {
      if (e.type === 'popstate' || (e.target instanceof Element && e.target.closest('a, select'))) clearTimeout(timer.current)
    }
    document.addEventListener('click', cancel, true)
    document.addEventListener('change', cancel, true)
    window.addEventListener('popstate', cancel)
    return () => {
      document.removeEventListener('click', cancel, true)
      document.removeEventListener('change', cancel, true)
      window.removeEventListener('popstate', cancel)
      clearTimeout(timer.current)
    }
  }, [])

  // The box takes every key at once; the table follows as soon as it can (React redraws it at low priority, so a
  // long list never holds the typing back)
  const q = useDeferredValue(live.trim().slice(0, MAX_QUERY))
  // Another province is another list: the rows of the one before do not count
  const rows = data?.source === source ? data.rows : null
  const found = useMemo(() => (rows && q !== params.query ? filterRows(rows, q) : null), [rows, q, params.query])

  const load = () => {
    if (rows || fetching.current === source) return
    fetching.current = source
    fetch(source)
      .then((res) => (res.ok ? (res.json() as Promise<{ rows: ListRow[] }>) : Promise.reject(new Error(String(res.status)))))
      .then((body) => setData({ source, rows: body.rows }))
      // The server's search still works; the next key tries again
      .catch(() => {
        fetching.current = ''
      })
  }
  const sync = (value: string) => {
    clearTimeout(timer.current)
    const query = value.trim().slice(0, MAX_QUERY)
    if (query !== params.query) router.replace({ pathname, query: listQuery({ ...params, page: 1, query }) }, { scroll: false })
  }
  const change = (value: string) => {
    setLive(value)
    load()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => sync(value), SYNC_MS)
  }

  return (
    <SearchScope.Provider value={{ live, q, found, params, pathname, change, submit: () => sync(live), load }}>
      {children}
    </SearchScope.Provider>
  )
}

/** The box's query for the province choice, so a new province keeps the search; null outside a search scope. */
export function useSearchQuery(): string | null {
  return useContext(SearchScope)?.q ?? null
}

type BoxProps = {
  /** the list's localized path, for the form without JS */
  action: string
  /** the query the form keeps without JS (the province and the page size) */
  keep: Record<string, string>
  /** the list without the search, for "Aramayı temizle" without JS */
  clearHref: string
  labels: { label: string; placeholder: string; button: string; clear: string }
}

/** The box: Enter and Bul send the address at once; without JS the form's GET does the search. */
export function RankingsSearch({ action, keep, clearHref, labels }: BoxProps) {
  const scope = useContext(SearchScope)
  if (!scope) throw new Error('RankingsSearch needs a RankingsSearchScope')
  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        scope.submit()
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="rankings-search" className="t-label mb-2 block text-fg-2">
          {labels.label}
        </label>
        {scope.q && (
          <a
            href={clearHref}
            onClick={(e) => {
              e.preventDefault()
              scope.change('')
            }}
            className="text-sm font-semibold text-brand-ink underline"
          >
            {labels.clear}
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <input
          id="rankings-search"
          type="search"
          name="ara"
          value={scope.live}
          maxLength={MAX_QUERY}
          placeholder={labels.placeholder}
          autoComplete="off"
          onFocus={scope.load}
          onChange={(e) => scope.change(e.target.value)}
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

/** The count beside the list: the browser's while it is ahead, the server's otherwise. Polite, so a screen reader
 *  hears the new count (or no match) as the list changes. */
export function SearchCount({ children }: { children: ReactNode }) {
  const scope = useContext(SearchScope)
  const t = useTranslations('rankings')
  const found = scope?.found
  if (!scope || !found) {
    return (
      <p aria-live="polite" className="text-sm text-fg-2 tabular-nums">
        {children}
      </p>
    )
  }
  const counts = { from: 1, to: Math.min(found.length, scope.params.size), total: found.length }
  return (
    <p aria-live="polite" className="text-sm text-fg-2 tabular-nums">
      {found.length === 0 ? (
        <span className="sr-only">{t('searchNone', { query: scope.q })}</span>
      ) : scope.q ? (
        t('searchCount', { query: scope.q, ...counts })
      ) : (
        t('count', counts)
      )}
    </p>
  )
}

/** The list: the browser's first page of found rows (the same table and pages) while it is ahead, the server's
 *  page otherwise. */
export function SearchResults({ kind, il, locale, children }: { kind: ListKind; il: boolean; locale: Locale; children: ReactNode }) {
  const scope = useContext(SearchScope)
  const t = useTranslations('rankings')
  if (!scope?.found) return children
  const { found, q, params, pathname } = scope
  if (found.length === 0) return <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">{t('searchNone', { query: q })}</p>
  const shown = { ...params, page: 1, query: q }
  return (
    <>
      <RankingsTable kind={kind} rows={found.slice(0, params.size)} il={il} locale={locale} />
      <RankingsPager params={shown} last={pageCount(found.length, params.size)} link={(change) => ({ pathname, query: listQuery({ ...shown, ...change }) })} />
    </>
  )
}
