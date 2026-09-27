// lib/slug.test.ts
import { describe, expect, it } from 'vitest'
import { trSlug } from '@/lib/slug'

describe('trSlug', () => {
  it('transliterates Turkish letters and keeps only [a-z0-9-]', () => {
    expect(trSlug('İlk yarışma: Ankara Open 2026!')).toBe('ilk-yarisma-ankara-open-2026')
    expect(trSlug('Şğüöçı ŞĞÜÖÇI')).toBe('sguoci-sguoci')
    expect(trSlug('speedcubingturkiye.org yayında')).toBe('speedcubingturkiye-org-yayinda')
    expect(trSlug('NewAgeTurkey2026')).toBe('newageturkey2026')
  })

  it('collapses runs of separators and trims the ends', () => {
    expect(trSlug('  --Yeni   yarışma--  ')).toBe('yeni-yarisma')
    expect(trSlug('')).toBe('')
    expect(trSlug('???')).toBe('')
  })
})
