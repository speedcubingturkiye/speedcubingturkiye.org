// lib/rankings-view.ts: paging and "Sıramı bul" for the rankings pages (full rankings spec §7)
import type { RankingRow } from '@/lib/wca/types'

export const PAGE_SIZES = [25, 50, 100, 500] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_SIZE: PageSize = 100
export const MAX_QUERY = 50

export type SearchParamsRecord = Record<string, string | string[] | undefined>
export type ListParams = { page: number; size: PageSize; query: string }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size))
}

/** ?sayfa → a page within 1…last; anything else is page 1. */
export function parsePage(sp: SearchParamsRecord, total: number, size: number): number {
  const raw = Number.parseInt(first(sp.sayfa) ?? '', 10)
  return Math.min(raw > 1 ? raw : 1, pageCount(total, size))
}

/** ?sayfa, ?boyut, ?ara → valid values: an unknown size is 100, the page stays within 1…last, the query ≤ 50 characters. */
export function parseListParams(sp: SearchParamsRecord, total: number): ListParams {
  const asked = Number(first(sp.boyut))
  const size = PAGE_SIZES.find((s) => s === asked) ?? DEFAULT_SIZE
  const query = (first(sp.ara) ?? '').trim().slice(0, MAX_QUERY)
  return { page: parsePage(sp, total, size), size, query }
}

/** 1-based first and last row on a page; 0 and 0 for an empty ranking. */
export function rowRange(page: number, size: number, total: number): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 }
  return { from: (page - 1) * size + 1, to: Math.min(page * size, total) }
}

/** The page that holds the 0-based row `index`. */
export function pageOfIndex(index: number, size: number): number {
  return Math.floor(index / size) + 1
}

/** After a size change, the page that still shows the first row the visitor was looking at. */
export function pageAfterResize(page: number, size: number, newSize: number): number {
  return pageOfIndex((page - 1) * size, newSize)
}

/** Page links: first, last and current ± radius; 'gap' where pages are skipped (a gap of one page shows that page). */
export function pageItems(current: number, count: number, radius: number): (number | 'gap')[] {
  const pages = new Set([1, count])
  for (let p = current - radius; p <= current + radius; p++) if (p >= 1 && p <= count) pages.add(p)
  const out: (number | 'gap')[] = []
  let prev = 0
  for (const p of [...pages].sort((a, b) => a - b)) {
    if (prev > 0 && p - prev === 2) out.push(prev + 1)
    else if (prev > 0 && p - prev > 2) out.push('gap')
    out.push(p)
    prev = p
  }
  return out
}

/** Turkish lower case without accents, dotless ı as i: "Şükrü IŞIK" → "sukru isik". */
export function normalize(text: string): string {
  return text.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')
}

/** The rows whose name and WCA ID contain every word of the query, in ranking order; every row for an empty query. */
export function filterRows(rows: RankingRow[], query: string): RankingRow[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return rows
  return rows.filter((row) => {
    const text = normalize(`${row.personName} ${row.personId}`)
    return words.every((w) => text.includes(w))
  })
}

/** Query object for a rankings link; the defaults (page 1, 100 per page, no search) stay out of the URL. */
export function listQuery({ page, size, query }: ListParams): Record<string, string> {
  const q: Record<string, string> = {}
  if (page > 1) q.sayfa = String(page)
  if (size !== DEFAULT_SIZE) q.boyut = String(size)
  if (query) q.ara = query
  return q
}
