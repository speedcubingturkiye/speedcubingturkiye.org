// lib/nav.test.ts
import { describe, expect, it } from 'vitest'
import { COMPETITIONS_NAV, HEADER_NAV, isActiveItem, ORG_NAV } from '@/lib/nav'

const item = (key: string) => {
  const found = HEADER_NAV.find((i) => i.key === key)
  if (!found) throw new Error(key)
  return found
}

describe('header navigation', () => {
  it('has two dropdown groups and two plain links, in order, sharing the section tabs', () => {
    expect(HEADER_NAV.map((i) => i.key)).toEqual(['information', 'competitions', 'rankings', 'news'])
    expect(COMPETITIONS_NAV.map((p) => p.href)).toEqual(['/yarismalar', '/yarismalar/ilk-yarismam', '/yarismalar/sss', '/yarismalar/ebeveynler-icin'])
    expect(ORG_NAV.map((p) => p.href)).toEqual(['/hakkimizda', '/belgeler', '/guvenli-ortam', '/goruntu-bildirimi', '/gonullu-ol'])
  })

  it('marks a group active on any of its pages and below them', () => {
    for (const { href } of ORG_NAV) expect(isActiveItem(href, item('information')), href).toBe(true)
    expect(isActiveItem('/yarismalar/SideQuestsIstanbul2026', item('competitions'))).toBe(true)
    expect(isActiveItem('/haberler', item('information'))).toBe(false)
  })

  it('marks a plain link active on its path and below it only', () => {
    expect(isActiveItem('/haberler/site-yayinda', item('news'))).toBe(true)
    expect(isActiveItem('/', item('rankings'))).toBe(false)
  })
})
