// lib/il-ranking.ts: the il ranking (spec 2026-10-21, Parça 2). The rankings pages narrow the national list to the
// members who joined from Hesabım. The list lives in the members sheet only, never in the repo, which is public.
import { rankingMembers } from '@/lib/membership-sheet'
import { filterRows, parseListParams, type SearchParamsRecord } from '@/lib/rankings-view'
import { PLACE_BY_SLUG, provinceSlug } from '@/lib/wca/city'
import type { RankingRow } from '@/lib/wca/types'

/** A line of any national list (an event's, or an all-round one): the national rank and the person. */
type Listed = Pick<RankingRow, 'pos' | 'personId' | 'personName'>
export type ProvinceRow<T extends Listed = RankingRow> = T & { provincePos: number }

const TTL_MS = 3_600_000
/** After a failure the sheet is asked again a minute later, not on every visit (2026-10-22) */
const RETRY_MS = 60_000
// ponytail: one copy per server instance, refreshed before use once an hour old, so a member who leaves drops out
// within the hour the privacy notice promises; a shared cache would need a revalidation call on every Hesabım change.
let cache: { at: number; byId: Map<string, string> } | null = null
let failedAt = -Infinity

/** WCA ID to province slug (or 'yurt-disi') for every member in the il ranking; null while the sheet does not answer. */
export async function provinceMembers(now = Date.now()): Promise<Map<string, string> | null> {
  if (cache && now - cache.at < TTL_MS) return cache.byId
  if (now - failedAt < RETRY_MS) return null
  const members = await rankingMembers()
  if (members === 'error') {
    failedAt = now
    return null
  }
  cache = { at: now, byId: new Map(members.map((m) => [m.wcaId, provinceSlug(m.il)])) }
  return cache.byId
}

/** The national rows of one province's members, numbered again within it; a tie (same national rank) shares a rank. */
export function provinceRows<T extends Listed>(rows: T[], byId: Map<string, string>, slug: string): ProvinceRow<T>[] {
  const out: ProvinceRow<T>[] = []
  for (const r of rows) {
    if (byId.get(r.personId) !== slug) continue
    const prev = out.at(-1)
    out.push({ ...r, provincePos: prev && prev.pos === r.pos ? prev.provincePos : out.length + 1 })
  }
  return out
}

/**
 * What a rankings page lists: the national rows narrowed to ?il and then to ?ara (the page clamped to that list),
 * the province's name, and whether the province list could not be loaded.
 */
export async function narrowRows<T extends Listed>(all: T[], sp: SearchParamsRecord) {
  const { il } = parseListParams(sp, all.length)
  const byId = il ? await provinceMembers() : null
  const base: (T & { provincePos?: number })[] = !il ? all : byId ? provinceRows(all, byId, il) : []
  const rows = filterRows(base, parseListParams(sp, base.length).query)
  return { rows, params: parseListParams(sp, rows.length), province: PLACE_BY_SLUG.get(il) ?? '', unavailable: il !== '' && !byId }
}
