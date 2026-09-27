// lib/rankings-view.test.ts
import { describe, expect, it } from 'vitest'
import {
  filterRows,
  listQuery,
  normalize,
  pageAfterResize,
  pageCount,
  pageItems,
  pageOfIndex,
  parseListParams,
  rowRange,
} from '@/lib/rankings-view'
import type { RankingRow } from '@/lib/wca/types'

const row = (pos: number, personId: string, personName: string): RankingRow => ({ pos, personId, personName, best: 500 + pos })

describe('parseListParams', () => {
  it('defaults to page 1, 100 per page, no search', () => {
    expect(parseListParams({}, 2194)).toEqual({ page: 1, size: 100, query: '' })
  })
  it('reads valid values', () => {
    expect(parseListParams({ sayfa: '3', boyut: '50', ara: '  ahmet  ' }, 2194)).toEqual({ page: 3, size: 50, query: 'ahmet' })
    expect(parseListParams({ sayfa: ['2', '9'], boyut: ['25'] }, 2194)).toEqual({ page: 2, size: 25, query: '' })
  })
  it('repairs invalid values', () => {
    expect(parseListParams({ boyut: '30' }, 2194).size).toBe(100)
    expect(parseListParams({ sayfa: '0' }, 2194).page).toBe(1)
    expect(parseListParams({ sayfa: 'abc' }, 2194).page).toBe(1)
    expect(parseListParams({ sayfa: '99' }, 2194).page).toBe(22)
    expect(parseListParams({ sayfa: '5' }, 0).page).toBe(1)
    expect(parseListParams({ ara: 'x'.repeat(80) }, 10).query).toHaveLength(50)
  })
})

describe('pageCount and rowRange', () => {
  it('counts pages, at least one', () => {
    expect(pageCount(0, 100)).toBe(1)
    expect(pageCount(100, 100)).toBe(1)
    expect(pageCount(2194, 100)).toBe(22)
  })
  it('gives the 1-based rows of a page', () => {
    expect(rowRange(2, 100, 2194)).toEqual({ from: 101, to: 200 })
    expect(rowRange(22, 100, 2194)).toEqual({ from: 2101, to: 2194 })
    expect(rowRange(1, 100, 0)).toEqual({ from: 0, to: 0 })
  })
})

describe('pageOfIndex and pageAfterResize', () => {
  it('finds the page of a row', () => {
    expect(pageOfIndex(0, 100)).toBe(1)
    expect(pageOfIndex(99, 100)).toBe(1)
    expect(pageOfIndex(100, 100)).toBe(2)
  })
  it('keeps the first visible row after a size change', () => {
    expect(pageAfterResize(3, 100, 50)).toBe(5)
    expect(pageAfterResize(3, 100, 500)).toBe(1)
    expect(pageAfterResize(5, 50, 100)).toBe(3)
  })
})

describe('pageItems', () => {
  it('shows first, last and current ± radius with gaps', () => {
    expect(pageItems(6, 22, 2)).toEqual([1, 'gap', 4, 5, 6, 7, 8, 'gap', 22])
    expect(pageItems(1, 22, 2)).toEqual([1, 2, 3, 'gap', 22])
    expect(pageItems(22, 22, 1)).toEqual([1, 'gap', 21, 22])
    expect(pageItems(5, 22, 1)).toEqual([1, 'gap', 4, 5, 6, 'gap', 22])
  })
  it('shows the page instead of a one-page gap', () => {
    expect(pageItems(4, 22, 1)).toEqual([1, 2, 3, 4, 5, 'gap', 22])
    expect(pageItems(3, 5, 1)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(1, 1, 2)).toEqual([1])
  })
})

describe('normalize', () => {
  it('lowercases in Turkish and drops accents', () => {
    expect(normalize('Şükrü IŞIK')).toBe('sukru isik')
    expect(normalize('İpek Çağlar Öz')).toBe('ipek caglar oz')
    expect(normalize('ısık')).toBe('isik')
    expect(normalize('2015ISIK01')).toBe('2015isik01')
  })
})

describe('filterRows', () => {
  const rows = [row(1, '2015ISIK01', 'Şükrü Işık'), row(2, '2016KAYA01', 'Ayşe Kaya'), row(3, '2017DEMI01', 'Emre Demir')]
  it('keeps the rows whose name and WCA ID contain every word, in ranking order', () => {
    expect(filterRows(rows, 'sukru')).toEqual([rows[0]])
    expect(filterRows(rows, 'ISIK sükrü')).toEqual([rows[0]])
    expect(filterRows(rows, '2016kaya')).toEqual([rows[1]])
    expect(filterRows(rows, 'e')).toEqual([rows[1], rows[2]])
    expect(filterRows(rows, 'ayse demir')).toEqual([])
  })
  it('returns every row for an empty query', () => {
    expect(filterRows(rows, '   ')).toBe(rows)
  })
})

describe('listQuery', () => {
  it('leaves the defaults out of the URL', () => {
    expect(listQuery({ page: 1, size: 100, query: '' })).toEqual({})
    expect(listQuery({ page: 2, size: 50, query: 'ahmet' })).toEqual({ sayfa: '2', boyut: '50', ara: 'ahmet' })
  })
})
