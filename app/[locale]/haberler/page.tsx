import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import { listNews } from '@/lib/content'
import { pageMeta } from '@/lib/metadata'
import { NewsCard } from '@/components/NewsCard'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('news')
  const meta = pageMeta(locale, '/haberler', { title: t('title'), description: t('description') })
  // RSS autodiscovery: <link rel="alternate" type="application/rss+xml"> next to the hreflang links
  return {
    ...meta,
    alternates: { ...meta.alternates, types: { 'application/rss+xml': getPathname({ locale, href: '/haberler/rss.xml' }) } },
  }
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('news')
  const items = await listNews(locale)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{t('title')}</h1>
          <p className="mt-3 text-lg text-fg-2">{t('description')}</p>
        </div>
        <a
          href={getPathname({ locale, href: '/haberler/rss.xml' })}
          className="t-label text-brand-ink underline underline-offset-2"
          type="application/rss+xml"
        >
          {t('rss')}
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-fg-2">{t('empty')}</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {items.map((item) => (
            <NewsCard key={item.slug} slug={item.slug} frontmatter={item.frontmatter} locale={locale} headingLevel="h2" />
          ))}
        </div>
      )}
    </section>
  )
}
