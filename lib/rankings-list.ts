// lib/rankings-list.ts: the one row shape of every rankings table (2026-10-22), for a page the server draws and for the
// browser's instant search alike, and the name of a list in the search data's address (app/api/siralamalar)
import type { AllRoundRow } from '@/lib/all-round'
import type { RankingType } from '@/lib/wca/rankings'
import { EVENTS } from '@/lib/wca/records'
import type { RankingRow } from '@/lib/wca/types'

/** A line of a rankings table: the ranks, the person, the value (an event's result, a Sum of Ranks, or a Kinch score
 *  in hundredths) and, in an all-round list, a cell per event (null without a result). */
export type ListRow = { pos: number; provincePos?: number; personId: string; personName: string; value: number; cells?: (number | null)[] }

/** Which list a table shows, and what its values need to be read. */
export type ListKind =
  | { mode: 'event'; eventId: string; type: RankingType }
  | { mode: 'sum'; type: RankingType; events: string[]; penalties: number[] }
  | { mode: 'kinch'; events: string[] }

type Narrowed<T> = T & { provincePos?: number }

export function eventListRows(rows: Narrowed<RankingRow>[]): ListRow[] {
  return rows.map(({ best, ...r }) => ({ ...r, value: best }))
}

// A Kinch score in hundredths: the server page and the browser print the same two decimals from the same number
const hundredths = (n: number) => Math.round(n * 100)

export function allRoundListRows(rows: Narrowed<AllRoundRow>[], kinch: boolean): ListRow[] {
  return rows.map(({ total, cells, ...r }) =>
    kinch ? { ...r, value: hundredths(total), cells: cells.map((c) => (c === null ? null : hundredths(c))) } : { ...r, value: total, cells },
  )
}

/** A list by name alone: an event's (single or average), a Sum of Ranks (single or average), or Kinch. */
export type ListName = { mode: 'event'; eventId: string; type: RankingType } | { mode: 'sum'; type: RankingType } | { mode: 'kinch' }

/** The search data's ?liste: "333-single", "toplam-average" or "kinch". */
export function listParam(list: ListName): string {
  return list.mode === 'event' ? `${list.eventId}-${list.type}` : list.mode === 'sum' ? `toplam-${list.type}` : 'kinch'
}

export function parseListParam(value: string): ListName | null {
  if (value === 'kinch') return { mode: 'kinch' }
  const [head, type] = value.split('-')
  if (type !== 'single' && type !== 'average') return null
  if (head === 'toplam') return { mode: 'sum', type }
  const event = EVENTS.find((e) => e.id === head)
  return event && (type === 'single' || event.hasAverage) ? { mode: 'event', eventId: head, type } : null
}
