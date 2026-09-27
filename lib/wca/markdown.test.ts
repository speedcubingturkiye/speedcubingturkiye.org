// lib/wca/markdown.test.ts
import { describe, expect, it } from 'vitest'
import { hardWrap, localizeTab, parseLinks, safeHref } from '@/lib/wca/markdown'

// Venue values as served by the WCA API (IstanbulApril2026, AnkaraJuly2026, IzmirOctober2025)
const loba = { text: 'Loba Coffee & Bakery Ankara Çukurambar', href: 'https://loba.com.tr' }
const ugur = { text: 'Uğur Okulları Bayraklı Folkart Kampüsü', href: 'https://ugurokullari.k12.tr/izmir-bayrakli-ugur-okullari-kampusu' }

describe('parseLinks', () => {
  it('keeps plain text as it is', () => {
    expect(parseLinks('Metrocity Alışveriş Merkezi')).toEqual(['Metrocity Alışveriş Merkezi'])
  })

  it('turns a whole-string link into one link part', () => {
    expect(parseLinks(`[${loba.text}](${loba.href})`)).toEqual([loba])
  })

  it('keeps the text before and after a link', () => {
    expect(parseLinks(`Salon: [${ugur.text}](${ugur.href}), 2. kat`)).toEqual(['Salon: ', ugur, ', 2. kat'])
  })

  it('finds two links', () => {
    expect(parseLinks(`[${loba.text}](${loba.href}) ya da [${ugur.text}](${ugur.href})`)).toEqual([loba, ' ya da ', ugur])
  })

  it('keeps a javascript: or relative URL as text', () => {
    expect(parseLinks('[tıkla](javascript:alert`1`)')).toEqual(['[tıkla](javascript:alert`1`)'])
    expect(parseLinks('Giriş [haritada](/harita) gösterilir')).toEqual(['Giriş [haritada](/harita) gösterilir'])
  })

  it('keeps unbalanced brackets as text', () => {
    for (const s of ['[Loba Coffee(https://loba.com.tr)', 'Loba Coffee](https://loba.com.tr)', '[Loba Coffee](https://loba.com.tr']) {
      expect(parseLinks(s)).toEqual([s])
    }
  })
})

describe('safeHref', () => {
  it('keeps http(s) and mailto URLs', () => {
    expect(safeHref('https://www.competitiongroups.com')).toBe('https://www.competitiongroups.com')
    expect(safeHref(' http://example.org/a ')).toBe('http://example.org/a')
    expect(safeHref('mailto:info@example.org')).toBe('mailto:info@example.org')
  })

  it('drops javascript:, data: and relative URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref(' JaVaScRiPt:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,x')).toBeNull()
    expect(safeHref('/kvkk')).toBeNull()
    expect(safeHref(undefined)).toBeNull()
  })
})

describe('hardWrap', () => {
  it('turns single line breaks into hard breaks and keeps paragraph breaks', () => {
    expect(hardWrap('**Soru:** Yaş sınırı var mı?\r\n**Cevap:** Yok.\r\n\r\n## English')).toBe('**Soru:** Yaş sınırı var mı?  \n**Cevap:** Yok.\n\n## English')
  })
})

describe('localizeTab', () => {
  // The two shapes Türkiye organizers use (BursaSummer2026 "Gruplar / Groups", NewAgeTurkey2026 "SSS / FAQ")
  const bracketed = { name: 'Gruplar / Groups', content: '[TR]\r\n\r\nGruplar linkte.\r\nKaçırma.\r\n\r\n[EN]\r\n\r\n\r\nGroups at the link.' }
  const headed = { name: 'SSS/FAQ', content: '## Türkçe:\r\n\r\n**Soru:** Yaş sınırı?\r\n\r\n----\r\n\r\n## English:\r\n\r\n**Q:** Age limit?' }

  it('keeps the page language part and its half of the name', () => {
    expect(localizeTab(bracketed, 'tr')).toEqual({ name: 'Gruplar', content: 'Gruplar linkte.\nKaçırma.' })
    expect(localizeTab(bracketed, 'en')).toEqual({ name: 'Groups', content: 'Groups at the link.' })
    expect(localizeTab(headed, 'tr')).toEqual({ name: 'SSS', content: '**Soru:** Yaş sınırı?' })
    expect(localizeTab(headed, 'en')).toEqual({ name: 'FAQ', content: '**Q:** Age limit?' })
  })

  it('leaves a tab without both marks whole', () => {
    const plain = { name: 'Yarışmacı Kara Liste', content: 'Metin\r\n\r\n[TR] satır içinde işaret sayılmaz' }
    expect(localizeTab(plain, 'en')).toEqual(plain)
  })
})
