// lib/wca/rankings.test.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadRankings, parseRankingFile, rankingsHref } from '@/lib/wca/rankings'

describe('parseRankingFile', () => {
  it('maps [rank, WCA ID, name, best] lines to rows', () => {
    expect(parseRankingFile('[\n[1,"2015ISIK01","Şükrü Işık",523],\n[2,"2016KAYA01","Ayşe Kaya",601]\n]\n')).toEqual([
      { pos: 1, personId: '2015ISIK01', personName: 'Şükrü Işık', best: 523 },
      { pos: 2, personId: '2016KAYA01', personName: 'Ayşe Kaya', best: 601 },
    ])
    expect(parseRankingFile('[]\n')).toEqual([])
  })

  it('rejects anything else', () => {
    expect(() => parseRankingFile('{}')).toThrow('not an array')
    expect(() => parseRankingFile('[[1,"A","B"]]')).toThrow('bad row 0')
    expect(() => parseRankingFile('[["1","A","B",5]]')).toThrow('bad row 0')
  })
})

describe('loadRankings', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'rankings-'))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('reads the event file with the export date', () => {
    mkdirSync(path.join(dir, 'single'))
    writeFileSync(path.join(dir, 'meta.json'), '{"exportDate":"2026-09-27T00:00:42Z","formatVersion":"2.0.2"}\n')
    writeFileSync(path.join(dir, 'single', '333.json'), '[\n[1,"2015ISIK01","Şükrü Işık",523]\n]\n')
    expect(loadRankings(dir, '333', 'single')).toEqual({
      rows: [{ pos: 1, personId: '2015ISIK01', personName: 'Şükrü Işık', best: 523 }],
      exportDate: '2026-09-27T00:00:42Z',
    })
  })

  it('is null before the first export run', () => {
    expect(loadRankings(dir, '333', 'single')).toBeNull()
    writeFileSync(path.join(dir, 'meta.json'), '{"exportDate":"2026-09-27T00:00:42Z","formatVersion":"2.0.2"}\n')
    expect(loadRankings(dir, '333', 'single')).toBeNull()
  })
})

describe('rankingsHref', () => {
  it('maps 3x3x3 single to /siralamalar', () => {
    expect(rankingsHref('333', 'single')).toBe('/siralamalar')
    expect(rankingsHref('444', 'average')).toBe('/siralamalar/444/ortalama')
  })
})
