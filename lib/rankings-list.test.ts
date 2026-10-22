import { describe, expect, it } from 'vitest'
import { allRoundListRows, eventListRows, listParam, parseListParam } from '@/lib/rankings-list'

describe('listParam / parseListParam', () => {
  it('names an event list, a Sum of Ranks and Kinch, and reads them back', () => {
    expect(listParam({ mode: 'event', eventId: '333bf', type: 'average' })).toBe('333bf-average')
    expect(listParam({ mode: 'sum', type: 'single' })).toBe('toplam-single')
    expect(listParam({ mode: 'kinch' })).toBe('kinch')
    expect(parseListParam('333bf-average')).toEqual({ mode: 'event', eventId: '333bf', type: 'average' })
    expect(parseListParam('toplam-single')).toEqual({ mode: 'sum', type: 'single' })
    expect(parseListParam('kinch')).toEqual({ mode: 'kinch' })
  })

  it('refuses an unknown event or type and an average that does not exist', () => {
    expect(parseListParam('')).toBeNull()
    expect(parseListParam('999-single')).toBeNull()
    expect(parseListParam('333-best')).toBeNull()
    expect(parseListParam('333mbf-average')).toBeNull()
  })
})

describe('eventListRows / allRoundListRows', () => {
  it('keeps the ranks and the person, and the value as the table shows it (Kinch in hundredths)', () => {
    expect(eventListRows([{ pos: 1, provincePos: 1, personId: 'A', personName: 'a', best: 500 }])).toEqual([
      { pos: 1, provincePos: 1, personId: 'A', personName: 'a', value: 500 },
    ])
    const row = { pos: 2, personId: 'B', personName: 'b', total: 50.274, cells: [100, null, 33.3333] }
    expect(allRoundListRows([row], true)).toEqual([{ pos: 2, personId: 'B', personName: 'b', value: 5027, cells: [10000, null, 3333] }])
    expect(allRoundListRows([{ ...row, total: 45, cells: [1, null] }], false)).toEqual([
      { pos: 2, personId: 'B', personName: 'b', value: 45, cells: [1, null] },
    ])
  })
})
