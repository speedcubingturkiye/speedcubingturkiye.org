// lib/section-nav.ts
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getPage } from '@/lib/content'
import { COMPETITIONS_NAV, ORG_NAV } from '@/lib/nav'
import { formatDate } from '@/lib/wca/format'

/** A section page as its tab and the section header (SectionHeader) show it */
export type SectionPage = { href: string; label: string; title: string; lead: string; note: string }
type Header = Omit<SectionPage, 'href' | 'label'>

// An MDX page's header comes from its frontmatter; the note is the last update, '' without one
async function mdxHeader(locale: Locale, slug: string): Promise<Header> {
  const [page, t] = await Promise.all([getPage(locale, slug), getTranslations('common')])
  if (!page) return { title: '', lead: '', note: '' }
  const { title, description, updated } = page.frontmatter
  return { title, lead: description, note: updated ? t('lastUpdated', { date: formatDate(updated, locale) }) : '' }
}

/** The Bilgi pages (the header's Bilgi menu), in tab order */
export async function organizationSection(locale: Locale): Promise<SectionPage[]> {
  const [nav, legal, forms] = await Promise.all([getTranslations('nav'), getTranslations('legal'), getTranslations('forms')])
  const headers: Record<(typeof ORG_NAV)[number]['href'], Header | Promise<Header>> = {
    '/hakkimizda': mdxHeader(locale, 'hakkimizda'),
    '/belgeler': { title: legal('documentsTitle'), lead: legal('documentsDescription'), note: legal('documentsLanguageNote') },
    '/guvenli-ortam': mdxHeader(locale, 'guvenli-ortam'),
    '/goruntu-bildirimi': mdxHeader(locale, 'goruntu-bildirimi'),
    '/gonullu-ol': { title: forms('volunteerTitle'), lead: forms('volunteerDescription'), note: '' },
  }
  return Promise.all(ORG_NAV.map(async ({ href, key }) => ({ href, label: nav(key), ...(await headers[href]) })))
}

/** The Yarışmalar pages (the header's Yarışmalar menu), in tab order */
export async function competitionsSection(locale: Locale): Promise<SectionPage[]> {
  const [nav, competitions] = await Promise.all([getTranslations('nav'), getTranslations('competitions')])
  const headers: Record<(typeof COMPETITIONS_NAV)[number]['href'], Header | Promise<Header>> = {
    '/yarismalar': { title: competitions('title'), lead: competitions('description'), note: '' },
    '/yarismalar/ilk-yarismam': mdxHeader(locale, 'yarismalar/ilk-yarismam'),
    '/yarismalar/sss': mdxHeader(locale, 'yarismalar/sss'),
    '/yarismalar/ebeveynler-icin': mdxHeader(locale, 'yarismalar/ebeveynler-icin'),
  }
  return Promise.all(COMPETITIONS_NAV.map(async ({ href, key }) => ({ href, label: nav(key), ...(await headers[href]) })))
}
