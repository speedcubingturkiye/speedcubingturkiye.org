// lib/reader.test.ts: every news entry and every singleton in the repo passes the panel's schema (spec §7).
// The reader validates data files, not MDX bodies; lib/content-check.ts covers the bodies.
import { describe, expect, it } from 'vitest'
import config, { PAGES, pageKey } from '@/keystatic.config'
import { DATA_SINGLETONS } from '@/lib/content-check'
import { SLUG_RE } from '@/lib/content-rules'
import { reader, singletons } from '@/lib/news'

describe('keystatic reader over the repo', () => {
  it('reads every news entry with both texts', async () => {
    const entries = await reader.collections.news.all()
    expect(entries.length).toBeGreaterThan(0)
    for (const { slug, entry } of entries) {
      expect(slug).toMatch(SLUG_RE)
      expect((await entry.tr()).trim()).not.toBe('')
      expect((await entry.en()).trim()).not.toBe('')
    }
  })

  it('reads every singleton: the 12 pages in both languages and the data files the gate checks, nothing else', async () => {
    const keys = Object.keys(config.singletons ?? {}) // typed optional: the config's singletons are a plain record
    const pages = PAGES.flatMap(([slug]) => [pageKey('tr', slug), pageKey('en', slug)])
    expect([...keys].sort()).toEqual([...pages, ...Object.keys(DATA_SINGLETONS)].sort()) // 24 + 5 = 29
    for (const key of keys) {
      const value = await singletons[key].readOrThrow({ resolveLinkedFiles: true })
      expect(value, key).toBeTruthy()
      if (key.startsWith('page')) expect(typeof value.body, key).toBe('string')
    }
  })
})
