import type { MetadataRoute } from 'next'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { site } from '@/site.config'
import { getCompetitions } from '@/lib/wca/competitions'
import { KINCH_HREF, rankingsHref, sumOfRanksHref } from '@/lib/wca/rankings'
import { EVENTS } from '@/lib/wca/records'
import { todayIstanbul } from '@/lib/wca/status'
import { listNews } from '@/lib/content'

export const revalidate = 3600

const STATIC = [
  '/',
  '/yarismalar',
  '/yarismalar/ilk-yarismam',
  '/yarismalar/sss',
  '/yarismalar/ebeveynler-icin',
  '/haberler',
  '/hakkimizda',
  '/belgeler',
  '/guvenli-ortam',
  '/goruntu-bildirimi',
  '/uye-ol',
  '/medya',
  '/iletisim',
  '/kvkk',
  '/cerez-politikasi',
]

// /siralamalar plus the 30 event/type pages (rankingsHref maps 3x3x3 single to /siralamalar), then the all-round lists
const RANKINGS = [
  ...EVENTS.flatMap((e) =>
    (e.hasAverage ? (['single', 'average'] as const) : (['single'] as const)).map((type) => rankingsHref(e.id, type)),
  ),
  sumOfRanksHref('single'),
  sumOfRanksHref('average'),
  KINCH_HREF,
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = todayIstanbul()
  const [comps, news] = await Promise.all([getCompetitions(), listNews('tr')]) // check-content guarantees EN twins
  const abs = (l: Locale, p: string) => site.url + getPathname({ locale: l, href: p })
  const entry = (p: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: abs('tr', p),
    ...(lastModified ? { lastModified } : {}), // only where a real date exists; never "now" for every URL
    changeFrequency: p === '/' ? 'daily' : 'weekly',
    priority: p === '/' ? 1 : 0.7,
    alternates: { languages: { tr: abs('tr', p), en: abs('en', p) } },
  })
  return [
    ...[...STATIC, ...RANKINGS, ...comps.filter((c) => c.end_date >= today).map((c) => `/yarismalar/${c.id}`)].map((p) => entry(p)),
    ...news.map((n) => entry(`/haberler/${n.slug}`, new Date(n.frontmatter.date))),
  ]
}
