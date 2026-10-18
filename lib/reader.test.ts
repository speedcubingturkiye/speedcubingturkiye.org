// lib/reader.test.ts: every news entry and every singleton in the repo passes the panel's schema (spec §7).
// The reader validates data files, not MDX bodies; lib/content-check.ts covers the bodies.
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
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

  it('reads every document, each with its PDFs on disk', async () => {
    const entries = await reader.collections.documents.all()
    expect(entries.length).toBeGreaterThan(0)
    for (const { slug, entry } of entries) {
      expect(slug).toMatch(SLUG_RE)
      for (const pdf of [entry.tr, entry.en]) {
        if (pdf) expect(existsSync(path.join(process.cwd(), 'public', pdf)), pdf).toBe(true)
      }
    }
  })

  it('reads every singleton: the 10 pages in both languages and the data files the gate checks, nothing else', async () => {
    const keys = Object.keys(config.singletons ?? {}) // typed optional: the config's singletons are a plain record
    const pages = PAGES.flatMap(([slug]) => [pageKey('tr', slug), pageKey('en', slug)])
    expect([...keys].sort()).toEqual([...pages, ...Object.keys(DATA_SINGLETONS)].sort()) // 20 + 5 = 25
    for (const key of keys) {
      const value = await singletons[key].readOrThrow({ resolveLinkedFiles: true })
      expect(value, key).toBeTruthy()
      if (key.startsWith('page')) expect(typeof value.body, key).toBe('string')
    }
  })
})
