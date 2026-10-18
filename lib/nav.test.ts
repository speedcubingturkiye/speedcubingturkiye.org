// lib/nav.test.ts
import { describe, expect, it } from 'vitest'
import { isActiveNav, ORG_NAV } from '@/lib/nav'

describe('isActiveNav', () => {
  it("keeps the header's organization item active on all five organization pages", () => {
    expect(ORG_NAV.map((p) => p.href)).toEqual(['/hakkimizda', '/belgeler', '/guvenli-ortam', '/goruntu-bildirimi', '/gonullu-ol'])
    for (const { href } of ORG_NAV) expect(isActiveNav(href, '/hakkimizda'), href).toBe(true)
    expect(isActiveNav('/haberler', '/hakkimizda')).toBe(false)
  })

  it('matches every other item by path prefix', () => {
    expect(isActiveNav('/yarismalar/SideQuestsIstanbul2026', '/yarismalar')).toBe(true)
    expect(isActiveNav('/', '/siralamalar')).toBe(false)
    expect(isActiveNav('/belgeler', '/yarismalar')).toBe(false)
  })
})
