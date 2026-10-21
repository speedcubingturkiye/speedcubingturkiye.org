// lib/il-ranking.ts: the il ranking (spec 2026-10-21, Parça 2). The rankings pages narrow the national list to the
// members who joined from Hesabım. The list lives in the members sheet only, never in the repo, which is public.
import { rankingMembers } from '@/lib/membership-sheet'
import { provinceSlug } from '@/lib/wca/city'
import type { RankingRow } from '@/lib/wca/types'

export type ProvinceRow = RankingRow & { provincePos: number }

const TTL_MS = 3_600_000
// ponytail: one copy per server instance, refreshed before use once an hour old, so a member who leaves drops out
// within the hour the privacy notice promises; a shared cache would need a revalidation call on every Hesabım change.
let cache: { at: number; byId: Map<string, string> } | null = null

/** WCA ID to province slug for every member in the il ranking; null while the sheet does not answer. */
export async function provinceMembers(now = Date.now()): Promise<Map<string, string> | null> {
  if (cache && now - cache.at < TTL_MS) return cache.byId
  const members = await rankingMembers()
  if (members === 'error') return null
  cache = { at: now, byId: new Map(members.map((m) => [m.wcaId, provinceSlug(m.il)])) }
  return cache.byId
}

/** The national rows of one province's members, numbered again within it; a tie (same national rank) shares a rank. */
export function provinceRows(rows: RankingRow[], byId: Map<string, string>, slug: string): ProvinceRow[] {
  const out: ProvinceRow[] = []
  for (const r of rows) {
    if (byId.get(r.personId) !== slug) continue
    const prev = out.at(-1)
    out.push({ ...r, provincePos: prev && prev.pos === r.pos ? prev.provincePos : out.length + 1 })
  }
  return out
}
