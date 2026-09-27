// lib/rankings-export.ts: WCA Results Export v2 → the Türkiye ranking files in data/rankings (full rankings spec §2–§4)
import { createReadStream, readdirSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { EVENTS } from '@/lib/wca/records'

export type RankType = 'single' | 'average'
/** One line of data/rankings/<type>/<event>.json: national rank, WCA ID, current name, best result. */
export type RankRow = [number, string, string, number]

/** The 31 files: every event single, plus average where the event has one. */
export const RANKING_FILES: { type: RankType; eventId: string; key: string }[] = EVENTS.flatMap((e) =>
  (e.hasAverage ? (['single', 'average'] as const) : (['single'] as const)).map((type) => ({ type, eventId: e.id, key: `${type}/${e.id}` })),
)

const TURKEY = 'Turkey'

/** 'v2.0.2' or '2.0.2' → 2; NaN when there is no leading number. */
export function exportMajor(version: string): number {
  return Number.parseInt(version.replace(/^v/i, ''), 10)
}

/** Column name → index from a TSV header line; a missing column throws with the file and the header named. */
function columns<T extends string>(header: string, needed: readonly T[], file: string): Record<T, number> {
  const names = header.split('\t').map((c) => c.trim())
  const out = {} as Record<T, number>
  for (const name of needed) {
    const i = names.indexOf(name)
    if (i === -1) throw new Error(`${file}: "${name}" sütunu yok (başlık: ${names.join(', ')})`)
    out[name] = i
  }
  return out
}

/** The one TSV of `table` in an unpacked export (`WCA_export_results.tsv` or `results.tsv`). */
function tableFile(dir: string, table: string): string {
  const hits = readdirSync(dir).filter((f) => f === `${table}.tsv` || f.endsWith(`_${table}.tsv`))
  if (hits.length !== 1) throw new Error(`${dir}: "${table}" tablosu için tek bir TSV bekleniyordu, bulunan: ${hits.join(', ') || 'yok'}`)
  return path.join(dir, hits[0])
}

/** Non-empty lines, streamed: the results table has millions of lines. */
async function* lines(file: string): AsyncGenerator<string> {
  for await (const line of createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })) if (line) yield line
}

/** Event → WCA ID → personal best. */
type Bests = Map<string, Map<string, number>>

/** Keeps the smaller value; -1 (DNF), -2 (DNS) and 0 (no result) never count. */
function keepBest(bests: Bests, eventId: string, personId: string, value: number): void {
  if (!(value > 0)) return
  const byPerson = bests.get(eventId) ?? new Map<string, number>()
  const previous = byPerson.get(personId)
  if (previous === undefined || value < previous) byPerson.set(personId, value)
  bests.set(eventId, byPerson)
}

/**
 * Personal bests over the results achieved while representing Türkiye (`person_country_id` is the country at that
 * competition): the WCA's national ranking rule. Someone who later changed citizenship keeps their Türkiye results,
 * and results for another country never count. Also returns the name on each person's results.
 */
async function turkishBests(file: string): Promise<{ single: Bests; average: Bests; names: Map<string, string> }> {
  const events = new Set(EVENTS.map((e) => e.id))
  const single: Bests = new Map()
  const average: Bests = new Map()
  const names = new Map<string, string>()
  let col: Record<'person_id' | 'person_name' | 'event_id' | 'best' | 'average' | 'person_country_id', number> | undefined
  for await (const line of lines(file)) {
    if (!col) {
      col = columns(line, ['person_id', 'person_name', 'event_id', 'best', 'average', 'person_country_id'] as const, path.basename(file))
      continue
    }
    const f = line.split('\t')
    if (f[col.person_country_id] !== TURKEY || !events.has(f[col.event_id])) continue
    const id = f[col.person_id]
    names.set(id, f[col.person_name])
    keepBest(single, f[col.event_id], id, Number(f[col.best]))
    keepBest(average, f[col.event_id], id, Number(f[col.average]))
  }
  if (!col) throw new Error(`${path.basename(file)}: dosya boş`)
  return { single, average, names }
}

/** Current names (the persons row with sub_id 1) of the given WCA IDs. */
async function currentNames(file: string, ids: Set<string>): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  let col: Record<'wca_id' | 'sub_id' | 'name', number> | undefined
  for await (const line of lines(file)) {
    if (!col) {
      col = columns(line, ['wca_id', 'sub_id', 'name'] as const, path.basename(file))
      continue
    }
    const f = line.split('\t')
    if (f[col.sub_id] === '1' && ids.has(f[col.wca_id])) out.set(f[col.wca_id], f[col.name])
  }
  if (!col) throw new Error(`${path.basename(file)}: dosya boş`)
  return out
}

/** Best value first, then name, then WCA ID; equal values share the rank of the first ("1, 1, 3"). */
function rankRows(bests: Map<string, number> | undefined, name: (id: string) => string): RankRow[] {
  const rows = [...(bests ?? [])].map(([id, value]): RankRow => [0, id, name(id), value])
  rows.sort((a, b) => a[3] - b[3] || a[2].localeCompare(b[2], 'tr') || a[1].localeCompare(b[1]))
  rows.forEach((row, i) => {
    row[0] = i > 0 && row[3] === rows[i - 1][3] ? rows[i - 1][0] : i + 1
  })
  return rows
}

/** All 31 files from an unpacked export folder (results and persons); an event without a Türkiye result gets an empty list. */
export async function buildRankings(dir: string): Promise<Map<string, RankRow[]>> {
  const { single, average, names } = await turkishBests(tableFile(dir, 'results'))
  const current = await currentNames(tableFile(dir, 'persons'), new Set(names.keys()))
  const name = (id: string) => current.get(id) ?? names.get(id) ?? id
  return new Map(RANKING_FILES.map((f) => [f.key, rankRows((f.type === 'single' ? single : average).get(f.eventId), name)]))
}

/** One row per line, so a daily diff only shows the people whose line changed. */
export function serializeRows(rows: RankRow[]): string {
  return rows.length === 0 ? '[]\n' : `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`
}

/** Files that fell by more than 10% from at least 100 rows: a broken or partial export must not wipe a ranking. */
export function shrinkViolations(previous: Map<string, number>, next: Map<string, number>): string[] {
  const out: string[] = []
  for (const [key, before] of previous) {
    const after = next.get(key) ?? 0
    if (before >= 100 && after < before * 0.9) out.push(`${key}: ${before} → ${after}`)
  }
  return out
}
