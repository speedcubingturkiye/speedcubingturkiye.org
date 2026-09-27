// lib/news.test.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listNews, newsFrontmatter, newsHash, readNews, type NewsEntry } from '@/lib/news'

const entry: NewsEntry = {
  title: 'Yeni yarışma: X',
  titleEn: 'New competition: X',
  description: 'TR özet',
  descriptionEn: 'EN summary',
  date: '2026-10-01',
  category: 'yarisma',
  auto: true,
  bulten: false,
  tr: async () => 'TR metin',
  en: async () => 'EN text',
}

describe('newsFrontmatter', () => {
  it('picks one language and keeps date, category and auto', () => {
    expect(newsFrontmatter(entry, 'tr')).toEqual({ title: 'Yeni yarışma: X', description: 'TR özet', date: '2026-10-01', category: 'yarisma', auto: true })
    expect(newsFrontmatter(entry, 'en')).toEqual({ title: 'New competition: X', description: 'EN summary', date: '2026-10-01', category: 'yarisma', auto: true })
  })
})

describe('news reader (repo content)', () => {
  it('lists site-yayinda from content/news with the old consumer shape', async () => {
    const items = await listNews('en')
    const item = items.find((i) => i.slug === 'site-yayinda')
    expect(item?.frontmatter).toEqual({
      title: 'speedcubingturkiye.org is live',
      description: 'The WCA competition calendar for Türkiye, national rankings and the first competition guide are live',
      date: '2026-09-25',
      category: 'topluluk',
      auto: false,
    })
  })

  it('reads one entry with its MDX source, filters by category and refuses bad slugs', async () => {
    const news = await readNews('tr', 'site-yayinda')
    expect(news?.frontmatter.title).toBe('speedcubingturkiye.org yayında')
    expect(news?.source).toContain("Speedcubing Türkiye'nin web sitesi yayında.")
    expect(await listNews('tr', { category: 'ilan' })).toEqual([])
    expect(await readNews('tr', '../site-yayinda')).toBeNull()
    expect(await readNews('tr', 'yok-boyle-haber')).toBeNull()
  })
})

describe('newsHash', () => {
  it('fingerprints the real site-yayinda entry: 64 hex characters, the same on every call', async () => {
    const hash = await newsHash('site-yayinda')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await newsHash('site-yayinda')).toBe(hash)
  })

  it('is null for an entry that does not exist and for a slug that could leave content/news', async () => {
    expect(await newsHash('yok-boyle-haber')).toBeNull()
    expect(await newsHash('../x')).toBeNull()
    expect(await newsHash('')).toBeNull()
  })

  describe('with a temporary root', () => {
    const files = { 'index.yaml': 'title: a\n', 'tr.mdx': 'Merhaba\n', 'en.mdx': 'Hello\n' }
    let root: string
    const write = (name: string, content: string, at = root) => {
      mkdirSync(path.join(at, 'content', 'news', 'x'), { recursive: true })
      writeFileSync(path.join(at, 'content', 'news', 'x', name), content)
    }

    beforeEach(() => {
      root = mkdtempSync(path.join(tmpdir(), 'news-hash-'))
      for (const [name, content] of Object.entries(files)) write(name, content)
    })
    afterEach(() => rmSync(root, { recursive: true, force: true }))

    it('changes when one byte of one file changes', async () => {
      const before = await newsHash('x', root)
      expect(before).toMatch(/^[0-9a-f]{64}$/)
      expect(await newsHash('x', root)).toBe(before)
      write('tr.mdx', 'Merhabb\n')
      expect(await newsHash('x', root)).not.toBe(before)
    })

    it('changes when a file is added, and when two files swap their contents', async () => {
      const before = await newsHash('x', root)
      write('tr.mdx', files['en.mdx'])
      write('en.mdx', files['tr.mdx'])
      const swapped = await newsHash('x', root)
      expect(swapped).not.toBe(before)
      write('extra.txt', '')
      expect(await newsHash('x', root)).not.toBe(swapped)
    })

    it('does not depend on the order the files were written in', async () => {
      const other = mkdtempSync(path.join(tmpdir(), 'news-hash-'))
      try {
        for (const [name, content] of Object.entries(files).reverse()) write(name, content, other)
        expect(await newsHash('x', other)).toBe(await newsHash('x', root))
      } finally {
        rmSync(other, { recursive: true, force: true })
      }
    })
  })
})
