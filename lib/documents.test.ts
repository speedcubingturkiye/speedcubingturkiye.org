// lib/documents.test.ts
import { describe, expect, it } from 'vitest'
import { documentSections, type SiteDocument } from '@/lib/documents'

const doc = (over: Partial<SiteDocument>): SiteDocument => ({
  slug: 'x',
  section: 'politika',
  code: '',
  version: '',
  title: { tr: 'X', en: 'X' },
  date: '2026-10-10',
  file: { tr: '/docs/x/tr.pdf', en: null },
  ...over,
})
const slugs = (docs: SiteDocument[], locale: 'tr' | 'en' = 'tr') => documentSections(docs, locale).map((s) => s.docs.map((d) => d.slug))

describe('documentSections', () => {
  it('keeps the page order (bylaws, motions, policies, financial reports) and leaves out empty sections', () => {
    const sections = documentSections(
      [doc({ slug: 'p', section: 'politika' }), doc({ slug: 'm', section: 'mali' }), doc({ slug: 't', section: 'tuzuk' })],
      'tr',
    )
    expect(sections.map((s) => s.section)).toEqual(['tuzuk', 'politika', 'mali'])
    expect(documentSections([], 'tr')).toEqual([])
  })

  it('sorts motions by number, numerically, with unnumbered ones last by title', () => {
    const docs = [
      doc({ slug: 'a', section: 'yonetmelik', code: '10.2026.1' }),
      doc({ slug: 'b', section: 'yonetmelik', code: '04.2026.2' }),
      doc({ slug: 'c', section: 'yonetmelik', code: '', title: { tr: 'Ek', en: 'Annex' } }),
      doc({ slug: 'd', section: 'yonetmelik', code: '04.2026.1' }),
      doc({ slug: 'e', section: 'yonetmelik', code: '2.2026.1' }),
    ]
    expect(slugs(docs)).toEqual([['e', 'd', 'b', 'a', 'c']])
  })

  it('sorts policies by title in the page language, Turkish letters in Turkish order', () => {
    const docs = [
      doc({ slug: 't', title: { tr: 'Tema', en: 'Alpha' } }),
      doc({ slug: 's1', title: { tr: 'Şema', en: 'Charlie' } }),
      doc({ slug: 's2', title: { tr: 'Sıra', en: 'Bravo' } }),
    ]
    expect(slugs(docs, 'tr')).toEqual([['s2', 's1', 't']])
    expect(slugs(docs, 'en')).toEqual([['t', 's2', 's1']])
  })

  it('lists the bylaws and financial reports newest first', () => {
    const docs = [
      doc({ slug: 'old', section: 'mali', date: '2026-01-31' }),
      doc({ slug: 'new', section: 'mali', date: '2026-12-01' }),
      doc({ slug: 't1', section: 'tuzuk', date: '2026-10-10' }),
      doc({ slug: 't2', section: 'tuzuk', date: '2027-03-01' }),
    ]
    expect(slugs(docs)).toEqual([['t2', 't1'], ['new', 'old']])
  })
})
