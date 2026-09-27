import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { site } from '@/site.config'
import { pageMeta } from '@/lib/metadata'
import { WCA_BASE } from '@/lib/wca/client'
import { getCompetitions, getNextCompetition, getUpcomingWithDetails } from '@/lib/wca/competitions'
import { listNews } from '@/lib/content'
import { BrandText } from '@/components/BrandText'
import { CompetitionCard } from '@/components/CompetitionCard'
import { CompetitionRow } from '@/components/CompetitionRow'
import { DataUnavailable } from '@/components/DataUnavailable'
import { FollowBand } from '@/components/FollowBand'
import { HomeHero } from '@/components/HomeHero'
import { NewsCard } from '@/components/NewsCard'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home')
  return pageMeta(await getLocale(), '/', { title: t('metaTitle'), description: t('metaDescription') })
}

export default async function HomePage() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  // getCompetitions() is also called inside getUpcomingWithDetails/getNextCompetition; the data cache dedupes the fetches.
  const [all, upcoming, next, news] = await Promise.all([
    getCompetitions(),
    getUpcomingWithDetails(),
    getNextCompetition(),
    listNews(locale, { limit: 3 }),
  ])

  const wrap = 'mx-auto max-w-6xl px-4 py-14'
  const more = 't-label text-brand-ink hover:underline'
  // R5: heading + link rows wrap on a phone, so the link never pushes the heading off-screen; a word wider than the
  // column breaks through the base heading rule in globals.css (the widest today, EN "COMPETITIONS", is 273px of 288px).
  const head = 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2'
  const h2 = 'min-w-0'

  return (
    <div>
      {/* Slide titles are h2s inside the carousel; this is the page's single h1 */}
      <h1 className="sr-only">
        <BrandText>{site.name}</BrandText>
      </h1>
      <HomeHero next={next} locale={locale} />

      {/* Yaklaşan yarışmalar (white). No data at all (first build / outage) → DataUnavailable, not "no competitions". */}
      <section className={wrap} aria-labelledby="upcoming-title">
        <div className={head}>
          <h2 id="upcoming-title" className={h2}>{t('upcomingTitle')}</h2>
          <Link href="/yarismalar" className={more}>
            {t('upcomingAll')}
          </Link>
        </div>
        {all.length === 0 ? (
          <div className="mt-6">
            <DataUnavailable href={`${WCA_BASE}/competitions?region=Turkey`} />
          </div>
        ) : (
          <>
            {upcoming.length === 1 && (
              // One competition is the calendar's full-width row, not a lone one-third card
              <ul className="mt-6 border-t border-line">
                <CompetitionRow comp={upcoming[0].comp} detail={upcoming[0].detail} locale={locale} />
              </ul>
            )}
            {upcoming.length > 1 && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {upcoming.slice(0, 3).map(({ comp, detail }) => (
                  <CompetitionCard key={comp.id} comp={comp} detail={detail} locale={locale} />
                ))}
              </div>
            )}
            {/* Newsletter box to the form in the red band below: under the list, or alone as the "no competitions" state */}
            <div className="mt-6 flex flex-col items-start gap-4 border border-line bg-bg-2 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="font-semibold">{t(upcoming.length > 0 ? 'upcomingNewsletterTitle' : 'noUpcomingTitle')}</p>
                <p className="mt-1 text-fg-2">{t(upcoming.length > 0 ? 'upcomingNewsletterText' : 'noUpcomingText')}</p>
              </div>
              {/* .btn never wraps; EN "Subscribe to the newsletter" (313px) must wrap inside the box on a 320-375px phone.
                  From 640px the box is a row and the button keeps its one line. */}
              <a href="#bulten-kayit" className="btn btn-brand max-w-full whitespace-normal text-center sm:shrink-0">
                {t('newsletterCta')}
              </a>
            </div>
          </>
        )}
      </section>

      {/* İlk yarışma adımları (bg-2): each title leads with its step number, no label above it. The number stays
          readable text: the ol's own numbering is lost to VoiceOver once list-style is none. */}
      <section className="bg-bg-2" aria-labelledby="steps-title">
        <div className={wrap}>
          <h2 id="steps-title" className={h2}>{t('stepsTitle')}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <li key={n}>
                {/* w-4 + gap-3 = the text's pl-7, so the text hangs under the title, not under the number */}
                <h3 className="flex gap-3">
                  <span className="w-4 shrink-0 text-brand-ink">{n}</span>
                  {t(`step${n}Title`)}
                </h3>
                <p className="mt-2 pl-7 text-fg-2">{t(`step${n}Text`)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/yarismalar/ilk-yarismam" className="btn btn-solid">
              {t('stepsGuide')}
            </Link>
            <Link href="/yarismalar/ebeveynler-icin" className="btn btn-outline">
              {t('stepsParents')}
            </Link>
          </div>
        </div>
      </section>

      {/* Son haberler (white) */}
      <section className={wrap} aria-labelledby="news-title">
        <div className={head}>
          <h2 id="news-title" className={h2}>{t('newsTitle')}</h2>
          <Link href="/haberler" className={more}>
            {t('allNews')}
          </Link>
        </div>
        {/* One item spans the band; three columns from two items up */}
        <div className={news.length > 1 ? 'mt-6 grid gap-4 md:grid-cols-3' : 'mt-6'}>
          {news.map((n) => (
            <NewsCard key={n.slug} slug={n.slug} frontmatter={n.frontmatter} locale={locale} />
          ))}
        </div>
      </section>

      {/* Bizi takip et + bülten (red); the layout's NewsletterStrip hides itself on this page */}
      <FollowBand locale={locale} />
    </div>
  )
}
