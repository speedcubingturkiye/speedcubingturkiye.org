import { describe, expect, it } from 'vitest'
import { kinch, sumOfRanks } from '@/lib/all-round'
import type { RankingRow } from '@/lib/wca/types'

const row = (pos: number, personId: string, best: number): RankingRow => ({ pos, personId, personName: personId, best })
const lists = (entries: [string, RankingRow[]][]) => new Map(entries)
const at = (id: string) => ['333', '222', '444', '555', '666', '777', '333bf', '333fm', '333oh', 'clock', 'minx', 'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf'].indexOf(id)
// WCA multi-blind value (new format 0DDTTTTTMM): DD = 99 − points, TTTTT = seconds, MM = missed
const mbld = (solved: number, missed: number, seconds: number) => (99 - (solved - missed)) * 1e7 + seconds * 100 + missed

describe('sumOfRanks', () => {
  it('adds the national ranks, counting the last rank + 1 for an event without a result', () => {
    const out = sumOfRanks(
      lists([
        ['333', [row(1, 'A', 500), row(2, 'B', 600), row(3, 'C', 700)]],
        ['222', [row(1, 'B', 100), row(2, 'A', 150)]],
      ]),
    )
    expect(out.events).toEqual(['333', '222'])
    expect(out.penalties).toEqual([4, 3])
    expect(out.rows.map((r) => [r.pos, r.personId, r.total, r.cells])).toEqual([
      [1, 'A', 3, [1, 2]],
      [1, 'B', 3, [2, 1]],
      [3, 'C', 6, [3, null]],
    ])
  })

  it('leaves out an event without a result from Türkiye; a tie at the bottom sets the penalty from its rank', () => {
    const out = sumOfRanks(
      lists([
        ['333', [row(1, 'A', 500), row(1, 'B', 500)]],
        ['555bf', []],
        ['222', [row(1, 'C', 100)]],
      ]),
    )
    expect(out.events).toEqual(['333', '222'])
    expect(out.penalties).toEqual([2, 2])
    expect(out.rows.map((r) => [r.pos, r.personId, r.total])).toEqual([
      [1, 'A', 3],
      [1, 'B', 3],
      [1, 'C', 3],
    ])
  })
})

describe('kinch', () => {
  it('scores 100 × the national record ÷ the best per event (the average in 3x3x3) and averages over 17 events', () => {
    const out = kinch(
      lists([['333', [row(1, 'A', 500), row(2, 'B', 1000)]]]),
      lists([['333', [row(1, 'B', 600), row(2, 'A', 1200)]]]),
    )
    expect(out.events).toHaveLength(17)
    expect(out.rows.map((r) => [r.pos, r.personId])).toEqual([
      [1, 'B'],
      [2, 'A'],
    ])
    expect(out.rows[0].total).toBeCloseTo(100 / 17)
    expect(out.rows[1].cells[at('333')]).toBeCloseTo(50)
    expect(out.rows[1].cells[at('222')]).toBeNull()
  })

  it('takes the better of single and average in 3BLD and FMC, and the single in 4BLD', () => {
    const out = kinch(
      lists([
        ['333bf', [row(1, 'A', 2000), row(2, 'B', 4000)]],
        ['333fm', [row(1, 'A', 20), row(2, 'B', 25)]],
        ['444bf', [row(1, 'B', 9000)]],
      ]),
      lists([
        ['333bf', [row(1, 'B', 3000), row(2, 'A', 6000)]],
        ['333fm', [row(1, 'A', 2500)]],
        ['444bf', [row(1, 'A', 9000)]],
      ]),
    )
    const b = out.rows.find((r) => r.personId === 'B')!
    expect(b.cells[at('333bf')]).toBeCloseTo(100) // average 100 beats single 50
    expect(b.cells[at('333fm')]).toBeCloseTo(80)
    expect(b.cells[at('444bf')]).toBeCloseTo(100)
    const a = out.rows.find((r) => r.personId === 'A')!
    expect(a.cells[at('444bf')]).toBeNull() // a 4BLD mean never counts
  })

  it('scores MBLD as points plus the part of the hour left', () => {
    const out = kinch(lists([['333mbf', [row(1, 'A', mbld(10, 0, 3000)), row(2, 'B', mbld(5, 1, 3600))]]]), lists([]))
    const b = out.rows.find((r) => r.personId === 'B')!
    expect(b.cells[at('333mbf')]).toBeCloseTo((100 * 4) / (10 + 600 / 3600))
  })

  it('shares the rank on an equal score and lists no one without a scoring result', () => {
    const out = kinch(
      lists([['333', [row(1, 'C', 400)]]]),
      lists([['222', [row(1, 'A', 300), row(1, 'B', 300)]]]),
    )
    expect(out.rows.map((r) => [r.pos, r.personId])).toEqual([
      [1, 'A'],
      [1, 'B'],
    ])
  })
})
