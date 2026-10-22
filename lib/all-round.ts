// lib/all-round.ts: the all-round lists of the rankings pages (spec 2026-10-22), Sum of Ranks and Kinch, made from the
// same data/rankings files as the event lists
import { multiBlind } from '@/lib/wca/format'
import { getRankings, type RankingType } from '@/lib/wca/rankings'
import { EVENTS } from '@/lib/wca/records'
import type { RankingRow } from '@/lib/wca/types'

/** One person in an all-round list: pos is the rank in it; cells follow the list's events, null without a result. */
export type AllRoundRow = { pos: number; personId: string; personName: string; total: number; cells: (number | null)[] }
/** penalties: Sum of Ranks only, what a missing result counts in each event. */
export type AllRound = { events: string[]; penalties: number[]; rows: AllRoundRow[] }
export type AllRoundData = AllRound & { exportDate: string }
/** Event → its Türkiye list, in national-rank order. */
export type EventLists = Map<string, RankingRow[]>

type Person = Omit<AllRoundRow, 'pos'>

/** Best total first, then name and WCA ID (as in the event lists); an equal total shares the rank ("1, 1, 3"). */
function ranked(people: Iterable<Person>, better: (a: number, b: number) => number): AllRoundRow[] {
  const sorted = [...people].sort(
    (a, b) => better(a.total, b.total) || a.personName.localeCompare(b.personName, 'tr') || a.personId.localeCompare(b.personId),
  )
  const out: AllRoundRow[] = []
  sorted.forEach((p, i) => out.push({ ...p, pos: i > 0 && p.total === sorted[i - 1].total ? out[i - 1].pos : i + 1 }))
  return out
}

/** The person's entry in `people`, made on first sight with no result in any of the `size` events. */
function person(people: Map<string, Person>, r: RankingRow, size: number): Person {
  const p = people.get(r.personId) ?? { personId: r.personId, personName: r.personName, total: 0, cells: Array(size).fill(null) }
  people.set(r.personId, p)
  return p
}

/**
 * Sum of Ranks: the national ranks added up, lowest first. A missing result counts the event's last rank + 1 (the
 * WCA Statistics rule); an event without a result from Türkiye stays out.
 */
export function sumOfRanks(lists: EventLists): AllRound {
  const events = [...lists].filter(([, rows]) => rows.length > 0)
  const penalties = events.map(([, rows]) => rows[rows.length - 1].pos + 1)
  const people = new Map<string, Person>()
  events.forEach(([, rows], i) => {
    for (const r of rows) person(people, r, events.length).cells[i] = r.pos
  })
  for (const p of people.values()) p.total = p.cells.reduce<number>((sum, c, i) => sum + (c ?? penalties[i]), 0)
  return { events: events.map(([id]) => id), penalties, rows: ranked(people.values(), (a, b) => a - b) }
}

// Kinch (kinch2002, SpeedSolving 2015): the single in 4BLD, 5BLD and MBLD, the better of the two in 3BLD and FMC, the
// average everywhere else
const KINCH_TYPES: Record<string, RankingType[]> = {
  '444bf': ['single'],
  '555bf': ['single'],
  '333mbf': ['single'],
  '333bf': ['single', 'average'],
  '333fm': ['single', 'average'],
}

/** A result as one number where higher is better: MBLD is points plus the part of the hour left, a time its inverse. */
function merit(eventId: string, value: number): number {
  if (eventId !== '333mbf') return 1 / value
  const { solved, attempted, seconds } = multiBlind(value)
  return solved - (attempted - solved) + Math.max(0, 3600 - seconds) / 3600
}

/**
 * Kinch: 100 × the national record ÷ the person's best in each event, averaged over all 17 events (0 without a
 * result), highest first. Someone without a counted result is not listed.
 */
export function kinch(single: EventLists, average: EventLists): AllRound {
  const events = EVENTS.map((e) => e.id)
  const people = new Map<string, Person>()
  events.forEach((id, i) => {
    for (const type of KINCH_TYPES[id] ?? ['average']) {
      const rows = (type === 'single' ? single : average).get(id) ?? []
      if (rows.length === 0) continue
      const record = Math.max(...rows.map((r) => merit(id, r.best)))
      for (const r of rows) {
        const p = person(people, r, events.length)
        p.cells[i] = Math.max(p.cells[i] ?? 0, (100 * merit(id, r.best)) / record)
      }
    }
  })
  for (const p of people.values()) p.total = p.cells.reduce<number>((sum, c) => sum + (c ?? 0), 0) / events.length
  return { events, penalties: [], rows: ranked([...people.values()].filter((p) => p.total > 0), (a, b) => b - a) }
}

/** Every event's list of `type` (the 17 singles, or the averages that exist); null while a data file is missing. */
async function eventLists(type: RankingType): Promise<{ lists: EventLists; exportDate: string } | null> {
  const events = EVENTS.filter((e) => type === 'single' || e.hasAverage)
  const files = await Promise.all(events.map((e) => getRankings(e.id, type)))
  const lists: EventLists = new Map()
  let exportDate = ''
  for (const [i, file] of files.entries()) {
    if (!file) return null
    lists.set(events[i].id, file.rows)
    exportDate = file.exportDate
  }
  return { lists, exportDate }
}

export async function getSumOfRanks(type: RankingType): Promise<AllRoundData | null> {
  const data = await eventLists(type)
  return data && { ...sumOfRanks(data.lists), exportDate: data.exportDate }
}

export async function getKinch(): Promise<AllRoundData | null> {
  const [single, average] = await Promise.all([eventLists('single'), eventLists('average')])
  return single && average && { ...kinch(single.lists, average.lists), exportDate: single.exportDate }
}
