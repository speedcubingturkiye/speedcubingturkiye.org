// lib/news.ts: news lives in content/news/<slug>/{index.yaml,tr.mdx,en.mdx} (spec §3.1) and is read through
// Keystatic's reader, so an entry the panel could not open fails here too (schema errors throw with the field name).
// Consumers keep the old shape: { slug, frontmatter: { title, description, date, category, auto } } in one language.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { createReader, type Entry } from '@keystatic/core/reader'
import type { Locale } from '@/i18n/routing'
import keystaticConfig from '@/keystatic.config'
import { SLUG_RE } from '@/lib/content-rules'

export type NewsEntry = Entry<(typeof keystaticConfig)['collections']['news']>
export type NewsCategory = NewsEntry['category']
export type NewsFrontmatter = { title: string; description: string; date: string; category: NewsCategory; auto?: boolean }

export const reader = createReader(process.cwd(), keystaticConfig)
/** The reader's singletons by key, for the prebuild gate and the reader test: the config types them as a plain record
 *  (the page keys are computed), so each one reads the same way. */
export const singletons = reader.singletons as unknown as Record<
  string,
  { readOrThrow: (opts: { resolveLinkedFiles: true }) => Promise<Record<string, unknown>> }
>

export function newsFrontmatter(entry: NewsEntry, locale: Locale): NewsFrontmatter {
  return {
    title: locale === 'tr' ? entry.title : entry.titleEn,
    description: locale === 'tr' ? entry.description : entry.descriptionEn,
    date: entry.date,
    category: entry.category,
    auto: entry.auto,
  }
}

/** The entry's data plus the requested language's MDX source; null for an unknown slug. */
export async function readNews(locale: Locale, slug: string): Promise<{ frontmatter: NewsFrontmatter; source: string } | null> {
  // The panel's slug field uses the same pattern (trSlug output); the cron lowercases WCA ids the same way.
  if (!SLUG_RE.test(slug)) return null
  const entry = await reader.collections.news.read(slug)
  if (!entry) return null
  return { frontmatter: newsFrontmatter(entry, locale), source: await entry[locale]() }
}

export async function listNews(
  locale: Locale,
  opts: { category?: NewsCategory; limit?: number } = {},
): Promise<{ slug: string; frontmatter: NewsFrontmatter }[]> {
  const entries = await reader.collections.news.all()
  const items = entries
    .map(({ slug, entry }) => ({ slug, frontmatter: newsFrontmatter(entry, locale) }))
    .filter((item) => !opts.category || item.frontmatter.category === opts.category)
  items.sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date) || a.slug.localeCompare(b.slug))
  return opts.limit ? items.slice(0, opts.limit) : items
}

/** A news entry as the newsletter needs it (spec §6.6): both languages and the two checkboxes. An empty English body
 *  falls back to the Turkish one. */
export type NewsForMail = {
  slug: string
  date: string
  bulten: boolean
  auto: boolean
  title: Record<Locale, string>
  description: Record<Locale, string>
  body: Record<Locale, string>
}

export async function readNewsForMail(slug: string): Promise<NewsForMail | null> {
  if (!SLUG_RE.test(slug)) return null
  const entry = await reader.collections.news.read(slug)
  if (!entry) return null
  const [tr, en] = await Promise.all([entry.tr(), entry.en()])
  return {
    slug,
    date: entry.date,
    bulten: entry.bulten,
    auto: entry.auto,
    title: { tr: entry.title, en: entry.titleEn },
    description: { tr: entry.description, en: entry.descriptionEn },
    body: { tr, en: en.trim() ? en : tr },
  }
}

/** A fingerprint of one entry's files (SHA-256, hex): the newsletter approval names the exact content it covers. Every
 *  file directly in content/news/<slug>/ counts, sorted by name, each fed as name, NUL, bytes, NUL (an entry keeps its
 *  files flat: index.yaml, tr.mdx, en.mdx). Null for a slug outside SLUG_RE or an entry that does not exist. */
export async function newsHash(slug: string, root = /* turbopackIgnore: true */ process.cwd()): Promise<string | null> {
  if (!SLUG_RE.test(slug)) return null
  const dir = path.join(root, 'content', 'news', slug)
  if (!existsSync(dir)) return null
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort()
  const hash = createHash('sha256')
  for (const name of names) hash.update(name).update('\0').update(readFileSync(path.join(dir, name))).update('\0')
  return hash.digest('hex')
}

/** Every news entry's newsletter flags, for scripts/pending-newsletters.ts. */
export async function listNewsletterFlags(): Promise<{ slug: string; date: string; bulten: boolean; auto: boolean }[]> {
  const all = await reader.collections.news.all()
  return all.map(({ slug, entry }) => ({ slug, date: entry.date, bulten: entry.bulten, auto: entry.auto }))
}
