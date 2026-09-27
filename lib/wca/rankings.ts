// lib/wca/rankings.ts: Türkiye rankings from data/rankings, built from the official WCA results export by
// scripts/rankings-data.ts and refreshed daily by .github/workflows/daily-data.yml (full rankings spec §3, §6)
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { RankingRow } from './types'

export type RankingType = 'single' | 'average'
/** Everyone representing Türkiye with a result in this event and type, in national-rank order, and the export date. */
export type Rankings = { rows: RankingRow[]; exportDate: string }

/** URL segment per type, identical in both locales (spec §5). */
export const TYPE_SEGMENT: Record<RankingType, string> = { single: 'tekli', average: 'ortalama' }

/** `/siralamalar` is 3x3x3 single; every other event/type lives under `/siralamalar/[event]/[type]`. */
export function rankingsHref(eventId: string, type: RankingType): string {
  return eventId === '333' && type === 'single' ? '/siralamalar' : `/siralamalar/${eventId}/${TYPE_SEGMENT[type]}`
}

/** A data/rankings/<type>/<event>.json file → rows; throws on anything but [rank, WCA ID, name, best] lines. */
export function parseRankingFile(text: string): RankingRow[] {
  const data: unknown = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('rankings file: not an array')
  return data.map((row: unknown, i) => {
    if (
      !Array.isArray(row) ||
      row.length !== 4 ||
      typeof row[0] !== 'number' ||
      typeof row[1] !== 'string' ||
      typeof row[2] !== 'string' ||
      typeof row[3] !== 'number'
    ) {
      throw new Error(`rankings file: bad row ${i}`)
    }
    return { pos: row[0], personId: row[1], personName: row[2], best: row[3] }
  })
}

/** Rankings from `dir`; null when meta.json or the event file is missing (only before the first export run). */
export function loadRankings(dir: string, eventId: string, type: RankingType): Rankings | null {
  const meta = path.join(dir, 'meta.json')
  const file = path.join(dir, type, `${eventId}.json`)
  if (!existsSync(meta) || !existsSync(file)) return null
  const { exportDate } = JSON.parse(readFileSync(meta, 'utf8')) as { exportDate: string }
  return { rows: parseRankingFile(readFileSync(file, 'utf8')), exportDate }
}

const DATA_DIR = path.join(process.cwd(), 'data', 'rankings')
// The files only change with a deploy, so production keeps them for the life of the server process; development reads
// them on every request, so a local `pnpm data:rankings` shows up without a restart.
const cache = new Map<string, Rankings | null>()

export async function getRankings(eventId: string, type: RankingType): Promise<Rankings | null> {
  const key = `${type}/${eventId}`
  if (process.env.NODE_ENV === 'production' && cache.has(key)) return cache.get(key) ?? null
  const rankings = loadRankings(DATA_DIR, eventId, type)
  cache.set(key, rankings)
  return rankings
}
