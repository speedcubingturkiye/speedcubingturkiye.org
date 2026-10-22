// lib/il-ranking.test.ts
import { describe, expect, it, vi } from 'vitest'
import { provinceMembers, provinceRows } from '@/lib/il-ranking'
import { rankingMembers } from '@/lib/membership-sheet'

vi.mock('@/lib/membership-sheet', () => ({ rankingMembers: vi.fn() }))

const row = (pos: number, personId: string) => ({ pos, personId, personName: personId, best: pos * 100 })

describe('provinceRows', () => {
  it('keeps one province, numbers it again, shares a rank on a tie and keeps the national rank', () => {
    const byId = new Map([['A', 'istanbul'], ['B', 'ankara'], ['C', 'istanbul'], ['D', 'istanbul'], ['E', 'istanbul']])
    const rows = [row(1, 'A'), row(2, 'B'), row(3, 'C'), row(3, 'D'), row(5, 'X'), row(6, 'E')]
    expect(provinceRows(rows, byId, 'istanbul').map((r) => [r.provincePos, r.pos, r.personId])).toEqual([
      [1, 1, 'A'],
      [2, 3, 'C'],
      [2, 3, 'D'],
      [4, 6, 'E'],
    ])
    expect(provinceRows(rows, byId, 'izmir')).toEqual([])
  })
})

describe('provinceMembers', () => {
  it('asks the sheet at most hourly, keys provinces by slug (abroad as yurt-disi), and after a failure waits a minute', async () => {
    vi.mocked(rankingMembers).mockResolvedValueOnce('error')
    expect(await provinceMembers(0)).toBeNull()
    expect(await provinceMembers(59_999)).toBeNull()
    expect(rankingMembers).toHaveBeenCalledTimes(1)
    const list = new Map([['2019AAAA01', 'sanliurfa'], ['2019BBBB01', 'hakkari'], ['2019CCCC01', 'yurt-disi']])
    vi.mocked(rankingMembers).mockResolvedValueOnce([
      { wcaId: '2019AAAA01', il: 'Şanlıurfa' },
      { wcaId: '2019BBBB01', il: 'Hakkâri' },
      { wcaId: '2019CCCC01', il: 'Yurt dışı' },
    ])
    expect(await provinceMembers(60_000)).toEqual(list)
    expect(await provinceMembers(60_000 + 3_599_999)).toEqual(list)
    expect(rankingMembers).toHaveBeenCalledTimes(2)
    vi.mocked(rankingMembers).mockResolvedValueOnce([])
    expect(await provinceMembers(60_000 + 3_600_000)).toEqual(new Map())
  })
})
