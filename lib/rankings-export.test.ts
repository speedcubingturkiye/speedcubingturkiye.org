// lib/rankings-export.test.ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildRankings, exportMajor, RANKING_FILES, serializeRows, shrinkViolations } from '@/lib/rankings-export'

const tsv = (...rows: string[][]) => `${rows.map((r) => r.join('\t')).join('\n')}\n`

// Columns are found by name, so the order here differs from the export's on purpose.
const PERSONS = tsv(
  ['name', 'gender', 'wca_id', 'sub_id', 'country_id'],
  ['Şükrü Işık', 'm', '2015ISIK01', '1', 'Turkey'],
  ['Eski Ad', 'm', '2015ISIK01', '2', 'Turkey'],
  ['Ayşe Kaya', 'f', '2016KAYA01', '1', 'Turkey'],
  ['Emre Demir', 'm', '2017DEMI01', '1', 'Turkey'],
  ['Ali Atmali', 'm', '2023ATMA01', '1', 'France'],
  ['Deniz Ak', 'o', '2019AKDE01', '1', 'Turkey'],
  ['John Smith', 'm', '2014SMIT01', '1', 'United Kingdom'],
)
// person_country_id is the country the person represented at that competition.
const RESULTS = tsv(
  ['competition_id', 'event_id', 'round_type_id', 'pos', 'best', 'average', 'person_name', 'person_id', 'format_id', 'person_country_id'],
  ['A2024', '333', 'f', '1', '523', '610', 'Şükrü Işık', '2015ISIK01', 'a', 'Turkey'],
  ['B2024', '333', 'f', '1', '540', '600', 'Eski Ad', '2015ISIK01', 'a', 'Turkey'],
  ['A2024', '333', 'f', '2', '601', '700', 'Ayşe Kaya', '2016KAYA01', 'a', 'Turkey'],
  ['A2024', '333', 'f', '3', '601', '0', 'Emre Demir', '2017DEMI01', 'a', 'Turkey'],
  ['A2024', '333', 'f', '4', '550', '650', 'Ali Atmali', '2023ATMA01', 'a', 'Turkey'],
  ['C2025', '333', 'f', '1', '400', '450', 'Ali Atmali', '2023ATMA01', 'a', 'France'],
  ['D2020', '333', 'f', '1', '480', '520', 'Deniz Ak', '2019AKDE01', 'a', 'Germany'],
  ['E2025', '333', 'f', '1', '-1', '-1', 'Deniz Ak', '2019AKDE01', 'a', 'Turkey'],
  ['A2024', '333', 'f', '5', '500', '560', 'John Smith', '2014SMIT01', 'a', 'United Kingdom'],
  ['A2024', '222', 'f', '1', '300', '350', 'Yeni Kişi', '2026YENI01', 'a', 'Turkey'],
  ['A2024', 'magic', 'f', '1', '9999', '0', 'Şükrü Işık', '2015ISIK01', 'a', 'Turkey'],
  ['A2024', '444bf', 'f', '1', '-2', '0', 'Ayşe Kaya', '2016KAYA01', 'a', 'Turkey'],
)

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'rankings-export-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function write(files: Record<string, string>) {
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text)
}
const EXPORT = { 'WCA_export_persons.tsv': PERSONS, 'WCA_export_results.tsv': RESULTS }

describe('buildRankings', () => {
  it('ranks the results achieved for Türkiye like the WCA: personal bests, ties share a rank', async () => {
    write(EXPORT)
    const out = await buildRankings(dir)
    // Ali Atmali now represents France but keeps his Türkiye result (his 400 for France does not count);
    // Deniz Ak's only Türkiye result is a DNF, and his Germany result does not count.
    expect(out.get('single/333')).toEqual([
      [1, '2015ISIK01', 'Şükrü Işık', 523],
      [2, '2023ATMA01', 'Ali Atmali', 550],
      [3, '2016KAYA01', 'Ayşe Kaya', 601],
      [3, '2017DEMI01', 'Emre Demir', 601],
    ])
    expect(out.get('average/333')).toEqual([
      [1, '2015ISIK01', 'Şükrü Işık', 600],
      [2, '2023ATMA01', 'Ali Atmali', 650],
      [3, '2016KAYA01', 'Ayşe Kaya', 700],
    ])
  })

  it('uses the current name, else the name on the result', async () => {
    write(EXPORT)
    const out = await buildRankings(dir)
    // 2015ISIK01's second result carries his old name; the table shows the current one (checked above).
    expect(out.get('single/222')).toEqual([[1, '2026YENI01', 'Yeni Kişi', 300]])
    expect(out.get('average/222')).toEqual([[1, '2026YENI01', 'Yeni Kişi', 350]])
  })

  it('returns all 31 files, empty where Türkiye has no valid result', async () => {
    write(EXPORT)
    const out = await buildRankings(dir)
    expect([...out.keys()]).toEqual(RANKING_FILES.map((f) => f.key))
    expect(out.size).toBe(31)
    expect(out.get('single/444bf')).toEqual([])
    expect(out.get('single/444')).toEqual([])
  })

  it('names a missing column', async () => {
    write({ ...EXPORT, 'WCA_export_results.tsv': RESULTS.replace('person_country_id', 'country') })
    await expect(buildRankings(dir)).rejects.toThrow('"person_country_id" sütunu yok')
  })

  it('needs every table', async () => {
    write({ 'WCA_export_persons.tsv': PERSONS })
    await expect(buildRankings(dir)).rejects.toThrow('"results"')
  })
})

describe('RANKING_FILES', () => {
  it('lists every event single, plus average where there is one', () => {
    expect(RANKING_FILES).toHaveLength(31)
    expect(RANKING_FILES.slice(0, 2)).toEqual([
      { type: 'single', eventId: '333', key: 'single/333' },
      { type: 'average', eventId: '333', key: 'average/333' },
    ])
    expect(RANKING_FILES.some((f) => f.key === 'average/333mbf')).toBe(false)
  })
})

describe('exportMajor', () => {
  it('reads the major version with or without v', () => {
    expect(exportMajor('v2.0.2')).toBe(2)
    expect(exportMajor('2.0.2')).toBe(2)
    expect(exportMajor('v3.0.0')).toBe(3)
    expect(exportMajor('x')).toBeNaN()
  })
})

describe('serializeRows', () => {
  it('writes one row per line', () => {
    expect(serializeRows([])).toBe('[]\n')
    expect(
      serializeRows([
        [1, '2015ISIK01', 'Şükrü Işık', 523],
        [2, '2016KAYA01', 'Ayşe Kaya', 601],
      ]),
    ).toBe('[\n[1,"2015ISIK01","Şükrü Işık",523],\n[2,"2016KAYA01","Ayşe Kaya",601]\n]\n')
  })
})

describe('shrinkViolations', () => {
  it('flags a drop of more than 10% from at least 100 rows', () => {
    const prev = new Map([
      ['single/333', 1000],
      ['single/444', 99],
      ['average/333', 200],
    ])
    expect(shrinkViolations(prev, new Map([['single/333', 899], ['single/444', 0], ['average/333', 180]]))).toEqual(['single/333: 1000 → 899'])
    expect(shrinkViolations(prev, new Map([['single/333', 900], ['single/444', 99], ['average/333', 200]]))).toEqual([])
    expect(shrinkViolations(new Map(), new Map([['single/333', 5]]))).toEqual([])
  })
})
