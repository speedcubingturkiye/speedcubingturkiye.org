// components/AllRoundView.tsx: the all-round lists (spec 2026-10-22), Sum of Ranks and Kinch: a line per competitor
// with the total, then a column per event. The panel, the table's pages, the search and the source are the event
// lists' own.
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { RankingsHeader, RankingsPanel, RankingsSource } from '@/components/RankingsParts'
import { RankingsSearchScope, SearchCount, SearchResults } from '@/components/RankingsSearch'
import { RankingsPager, RankingsTable } from '@/components/RankingsTable'
import type { AllRoundData } from '@/lib/all-round'
import { narrowRows } from '@/lib/il-ranking'
import { allRoundListRows, listParam, type ListKind } from '@/lib/rankings-list'
import { listQuery, pageCount, rowRange, type ListParams, type SearchParamsRecord } from '@/lib/rankings-view'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDate } from '@/lib/wca/format'
import { KINCH_HREF, sumOfRanksHref, type RankingType } from '@/lib/wca/rankings'
import { todayIstanbul } from '@/lib/wca/status'

// Kinch's method, in its author's post (kinch2002, SpeedSolving, May 2015)
const KINCH_SOURCE = 'https://www.speedsolving.com/threads/all-round-rankings-kinchranks.53353/'

type Props = {
  mode: 'sum' | 'kinch'
  /** the Sum of Ranks' type; Kinch has none */
  type?: RankingType
  /** null = no data files yet (only before the first export run) */
  data: AllRoundData | null
  locale: Locale
  searchParams: SearchParamsRecord
}

export async function AllRoundView({ mode, type = 'single', data, locale, searchParams }: Props) {
  const t = await getTranslations('rankings')
  // ?il and "Sıramı bul" narrow the list as in the event lists: national values, numbered again within the province
  const { rows, params, province, unavailable } = await narrowRows(data?.rows ?? [], searchParams)
  const { page, size, query, il } = params
  const pathname = mode === 'sum' ? sumOfRanksHref(type) : KINCH_HREF
  const link = (change: Partial<ListParams>) => ({ pathname, query: listQuery({ ...params, ...change }) })
  const last = pageCount(rows.length, size)
  const { from, to } = rowRange(page, size, rows.length)
  const date = formatDate(data ? data.exportDate.slice(0, 10) : todayIstanbul(), locale)
  const subtitle = [mode === 'sum' ? t(type) : '', province].filter(Boolean).join(' · ')
  const kind: ListKind | null = !data
    ? null
    : mode === 'sum'
      ? { mode, type, events: data.events, penalties: data.penalties }
      : { mode, events: data.events }
  const source = `/api/siralamalar?${new URLSearchParams({ liste: listParam(mode === 'sum' ? { mode, type } : { mode }), ...(il ? { il } : {}) })}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <RankingsSearchScope source={source} pathname={pathname} params={params}>
        <RankingsHeader />
        <RankingsPanel mode={mode} type={mode === 'sum' ? type : undefined} pathname={pathname} params={params} locale={locale} />

        {/* What the list shows and how it is counted, the count beside them */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            {/* Kinch is a name: CSS uppercase must not dot it on a Turkish page (KINCH, not KİNCH; R8) */}
            <h2>{mode === 'sum' ? t('sumTitle') : t.rich('kinchTitle', { en: (chunks) => <span lang="en">{chunks}</span> })}</h2>
            {subtitle ? <p className="mt-1 text-fg-2">{subtitle}</p> : null}
          </div>
          <SearchCount>
            {rows.length > 0 ? (
              query ? (
                t('searchCount', { query, from, to, total: rows.length })
              ) : (
                t('count', { from, to, total: rows.length })
              )
            ) : query ? (
              <span className="sr-only">{t('searchNone', { query })}</span>
            ) : null}
          </SearchCount>
        </div>
        <p className="mt-3 text-sm text-fg-2">
          {mode === 'sum'
            ? t('sumAbout')
            : t.rich('kinchAbout', {
                source: (chunks) => (
                  <a href={KINCH_SOURCE} rel="noopener noreferrer" target="_blank" className="font-semibold text-brand-ink underline">
                    {chunks}
                  </a>
                ),
              })}
        </p>

        {!data || !kind ? (
          <div className="mt-6">
            <DataUnavailable href={`${WCA_BASE}/results/rankings/333/single?region=Turkey`} />
          </div>
        ) : data.rows.length === 0 ? (
          <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">{t('listEmpty')}</p>
        ) : (
          <SearchResults kind={kind} il={il !== ''} locale={locale}>
            {rows.length === 0 ? (
              <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">
                {unavailable ? t('provinceUnavailable') : query ? t('searchNone', { query }) : t('provinceNone', { province })}
              </p>
            ) : (
              <>
                <RankingsTable kind={kind} rows={allRoundListRows(rows.slice(from - 1, to), mode === 'kinch')} il={il !== ''} locale={locale} />
                <RankingsPager params={params} last={last} link={link} />
              </>
            )}
          </SearchResults>
        )}

        <RankingsSource date={date} ranked={!!data} />
      </RankingsSearchScope>
    </div>
  )
}
