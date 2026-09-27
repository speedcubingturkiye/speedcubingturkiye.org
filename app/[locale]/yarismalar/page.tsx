// app/[locale]/yarismalar/page.tsx
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { CompetitionRow } from '@/components/CompetitionRow'
import { DataUnavailable } from '@/components/DataUnavailable'
import { Pager } from '@/components/Pager'
import { SectionNav } from '@/components/SectionNav'
import { pageMeta } from '@/lib/metadata'
import { pageCount, parsePage, type SearchParamsRecord } from '@/lib/rankings-view'
import { competitionsSectionNav } from '@/lib/section-nav'
import { WCA_BASE } from '@/lib/wca/client'
import { getCompetitions, getUpcomingWithDetails } from '@/lib/wca/competitions'
import { formatMonth } from '@/lib/wca/format'
import { todayIstanbul } from '@/lib/wca/status'
import type { CompetitionListItem } from '@/lib/wca/types'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('competitions')
  return pageMeta(await getLocale(), '/yarismalar', { title: t('title'), description: t('description') })
}

type Props = { searchParams: Promise<SearchParamsRecord> }

// Past competitions per page (?sayfa): about two desktop screens of rows, 7 pages in September 2026
const PAST_PER_PAGE = 20

// Rendered per request: ?sayfa picks the page of past competitions, and the upcoming ones show on page 1 only.
export default async function CompetitionsPage({ searchParams }: Props) {
  const locale = await getLocale()
  const t = await getTranslations('competitions')
  const [all, upcoming, sp] = await Promise.all([getCompetitions(), getUpcomingWithDetails(), searchParams])
  const today = todayIstanbul()
  const past = all.filter((c) => c.end_date < today) // newest first (getCompetitions order)
  const page = parsePage(sp, past.length, PAST_PER_PAGE)

  const months = new Map<string, CompetitionListItem[]>()
  for (const c of past.slice((page - 1) * PAST_PER_PAGE, page * PAST_PER_PAGE)) {
    const key = c.start_date.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), c])
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1>{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-fg-2">{t('description')}</p>
      </header>
      <SectionNav items={await competitionsSectionNav()} />

      {all.length === 0 ? (
        <div className="mt-10">
          <DataUnavailable href={`${WCA_BASE}/competitions?region=Turkey`} />
        </div>
      ) : (
        <>
          {page === 1 && (
            <section aria-labelledby="upcoming" className="mt-10">
              <h2 id="upcoming">{t('upcoming')}</h2>
              {upcoming.length === 0 ? (
                <p className="mt-4 text-fg-2">{t('noUpcoming')}</p>
              ) : (
                <ul className="mt-4">
                  {upcoming.map(({ comp, detail }) => (
                    <CompetitionRow key={comp.id} comp={comp} detail={detail} locale={locale} />
                  ))}
                </ul>
              )}
            </section>
          )}

          <section aria-labelledby="past" className={page === 1 ? 'mt-14' : 'mt-10'}>
            <h2 id="past">{t('past')}</h2>
            {past.length === 0 ? (
              <p className="mt-4 text-fg-2">{t('noPast')}</p>
            ) : (
              [...months].map(([key, comps]) => (
                <div key={key}>
                  <h3 className="t-label mt-8 text-fg-2">{formatMonth(key, locale)}</h3>
                  <ul>
                    {comps.map((c) => (
                      <CompetitionRow key={c.id} comp={c} locale={locale} />
                    ))}
                  </ul>
                </div>
              ))
            )}
            {/* The page links land on this section's heading, below the upcoming list on page 1 */}
            <Pager
              page={page}
              last={pageCount(past.length, PAST_PER_PAGE)}
              href={(p) => ({ pathname: '/yarismalar', query: p > 1 ? { sayfa: String(p) } : {}, hash: 'past' })}
            />
          </section>
        </>
      )}
    </div>
  )
}
