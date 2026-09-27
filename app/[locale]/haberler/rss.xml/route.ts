import { hasLocale } from 'next-intl'
import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { escapeHtml } from '@/lib/escape-html'
import { listNews } from '@/lib/content'
import { site } from '@/site.config'

// Cached for an hour. Reads only `params`, never `request` (that would make the route dynamic).
export const revalidate = 3600

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return new Response('Not found', { status: 404 })
  const abs = (href: string) => site.url + getPathname({ locale, href })
  const items = await listNews(locale)
  const channelTitle = locale === 'tr' ? `Haberler · ${site.name}` : `News · ${site.name}`
  const channelDescription: Record<Locale, string> = {
    tr: "Türkiye'deki WCA yarışma duyuruları, topluluk haberleri, rekorlar ve resmi ilanlar",
    en: 'WCA competition announcements in Türkiye, community news, records and official notices',
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeHtml(channelTitle)}</title>
<link>${abs('/haberler')}</link>
<atom:link href="${abs('/haberler/rss.xml')}" rel="self" type="application/rss+xml"/>
<description>${escapeHtml(channelDescription[locale])}</description>
<language>${locale}</language>
${items
  .map(
    ({ slug, frontmatter }) => `<item>
<title>${escapeHtml(frontmatter.title)}</title>
<link>${abs(`/haberler/${slug}`)}</link>
<guid isPermaLink="true">${abs(`/haberler/${slug}`)}</guid>
<pubDate>${new Date(frontmatter.date).toUTCString()}</pubDate>
<category>${escapeHtml(frontmatter.category)}</category>
<description>${escapeHtml(frontmatter.description)}</description>
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
