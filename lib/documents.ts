// lib/documents.ts: the documents page (/belgeler). Each document is content/documents/<slug>.yaml, read
// through Keystatic's reader like the news; its PDFs are public/docs/<slug>/tr.pdf and en.pdf.
import type { Locale } from '@/i18n/routing'
import { DOC_SECTIONS, type DocSection } from '@/lib/content-rules'
import { reader } from '@/lib/news'

export type SiteDocument = {
  slug: string
  section: DocSection
  /** motion number such as 04.2026.1; '' when none */
  code: string
  /** such as 1.0; '' when none */
  version: string
  title: Record<Locale, string>
  date: string
  /** the English PDF is optional; the Turkish text prevails (Tüzük 1.5) */
  file: { tr: string; en: string | null }
}

export async function listDocuments(): Promise<SiteDocument[]> {
  const entries = await reader.collections.documents.all()
  return entries.map(({ slug, entry }) => ({
    slug,
    section: entry.section,
    code: entry.code,
    version: entry.version,
    title: { tr: entry.title, en: entry.titleEn },
    date: entry.date,
    file: { tr: entry.tr, en: entry.en },
  }))
}

const numbers = new Intl.Collator('en', { numeric: true })

/**
 * The page's sections in DOC_SECTIONS order, empty ones left out. Motions sort by number, numerically (unnumbered ones
 * last, by title); policies by title in the page's language; the bylaws and financial reports newest first.
 */
export function documentSections(docs: SiteDocument[], locale: Locale): { section: DocSection; docs: SiteDocument[] }[] {
  const titles = new Intl.Collator(locale)
  const byTitle = (a: SiteDocument, b: SiteDocument) => titles.compare(a.title[locale], b.title[locale])
  const newestFirst = (a: SiteDocument, b: SiteDocument) => b.date.localeCompare(a.date) || byTitle(a, b)
  const order: Record<DocSection, (a: SiteDocument, b: SiteDocument) => number> = {
    tuzuk: newestFirst,
    yonetmelik: (a, b) => Number(!a.code) - Number(!b.code) || numbers.compare(a.code, b.code) || byTitle(a, b),
    politika: byTitle,
    mali: newestFirst,
  }
  return DOC_SECTIONS.map(({ value }) => ({ section: value, docs: docs.filter((d) => d.section === value).sort(order[value]) })).filter(
    (s) => s.docs.length > 0,
  )
}
