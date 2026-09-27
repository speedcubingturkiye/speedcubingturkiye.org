import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { listNews } from '@/lib/content'
import { pageMeta } from '@/lib/metadata'
import { organizationSectionNav } from '@/lib/section-nav'
import { NewsCard } from '@/components/NewsCard'
import { SectionNav } from '@/components/SectionNav'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('news')
  return pageMeta(locale, '/organizasyon/ilanlar', { title: t('announcementsTitle'), description: t('announcementsDescription') })
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('news')
  const items = await listNews(locale, { category: 'ilan' })
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('announcementsTitle')}</h1>
      <p className="mt-3 text-lg text-fg-2">{t('announcementsDescription')}</p>
      <div className="mt-8">
        <SectionNav items={await organizationSectionNav()} />
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-fg-2">{t('announcementsEmpty')}</p>
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
