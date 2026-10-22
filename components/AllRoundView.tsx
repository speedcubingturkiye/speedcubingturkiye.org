// components/AllRoundView.tsx: the all-round lists (spec 2026-10-22), Sum of Ranks and Kinch: a line per competitor
// with the total, then a column per event. The panel, the pages and the source are the event lists' own.
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { RankingsHeader, RankingsPager, RankingsPanel, RankingsSource } from '@/components/RankingsParts'
import type { AllRoundData } from '@/lib/all-round'
import { narrowRows } from '@/lib/il-ranking'
import { listQuery, pageCount, rowRange, type ListParams, type SearchParamsRecord } from '@/lib/rankings-view'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDate } from '@/lib/wca/format'
import { KINCH_HREF, sumOfRanksHref, type RankingType } from '@/lib/wca/rankings'
import { EVENTS, eventNameLang } from '@/lib/wca/records'
import { todayIstanbul } from '@/lib/wca/status'

// Kinch's method, in its author's post (kinch2002, SpeedSolving, May 2015)
const KINCH_SOURCE = 'https://www.speedsolving.com/threads/all-round-rankings-kinchranks.53353/'
const NUMBER_TAG: Record<Locale, string> = { tr: 'tr-TR', en: 'en-GB' }

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
  // A Sum of Ranks is a whole number, a Kinch score has two decimals in the page's language (71,71 / 71.71)
  const decimals = new Intl.NumberFormat(NUMBER_TAG[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const show = (n: number) => (mode === 'sum' ? String(n) : decimals.format(n))
  const subtitle = [mode === 'sum' ? t(type) : '', province].filter(Boolean).join(' · ')
  const name = (id: string) => EVENTS.find((e) => e.id === id)?.name[locale] ?? id

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <RankingsHeader />
      <RankingsPanel mode={mode} type={mode === 'sum' ? type : undefined} pathname={pathname} params={params} locale={locale} />

      {/* What the list shows and how it is counted, the count beside them */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          {/* Kinch is a name: CSS uppercase must not dot it on a Turkish page (KINCH, not KİNCH; R8) */}
          <h2>{mode === 'sum' ? t('sumTitle') : t.rich('kinchTitle', { en: (chunks) => <span lang="en">{chunks}</span> })}</h2>
          {subtitle ? <p className="mt-1 text-fg-2">{subtitle}</p> : null}
        </div>
        {/* Always there and polite: a screen reader hears the new count (or no match) as the search changes the list */}
        <p aria-live="polite" className="text-sm text-fg-2 tabular-nums">
          {rows.length > 0 ? (
            query ? (
              t('searchCount', { query, from, to, total: rows.length })
            ) : (
              t('count', { from, to, total: rows.length })
            )
          ) : query ? (
            <span className="sr-only">{t('searchNone', { query })}</span>
          ) : null}
        </p>
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

      {!data ? (
        <div className="mt-6">
          <DataUnavailable href={`${WCA_BASE}/results/rankings/333/single?region=Turkey`} />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">{t('listEmpty')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">
          {unavailable ? t('provinceUnavailable') : query ? t('searchNone', { query }) : t('provinceNone', { province })}
        </p>
      ) : (
        <>
          {/* Wider than a phone: the table scrolls sideways within the page */}
          <div className="-mx-4 mt-4 overflow-x-auto px-4">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="t-label border-b-2 border-fg text-fg-2">
                  <th scope="col" className="w-12 py-2 pr-3">
                    {t('rank')}
                  </th>
                  {il ? (
                    <th scope="col" className="w-20 py-2 pr-3">
                      {t('nationalRank')}
                    </th>
                  ) : null}
                  <th scope="col" className="py-2 pr-3">
                    {t('competitor')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    {t(mode === 'sum' ? 'total' : 'score')}
                  </th>
                  {/* relative: the sr-only name is positioned within its cell, so it scrolls with the table instead of
                      widening the page */}
                  {data.events.map((id) => (
                    <th key={id} scope="col" title={name(id)} className="relative px-1.5 py-2 text-center">
                      <span className={`cubing-icon event-${id} text-lg leading-none`} aria-hidden="true" />
                      <span className="sr-only" lang={eventNameLang(id)}>
                        {name(id)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(from - 1, to).map((r) => (
                  <tr key={r.personId} className="border-b border-line">
                    <td className="py-3 pr-3 font-bold tabular-nums">{r.provincePos ?? r.pos}</td>
                    {il ? <td className="py-3 pr-3 text-fg-2 tabular-nums">{r.pos}</td> : null}
                    {/* min-w-36: on a phone a long name takes two lines, so the first event columns show beside it and
                        tell that the table goes on sideways */}
                    <td className="min-w-36 py-3 pr-3">
                      <a href={`${WCA_BASE}/persons/${r.personId}`} rel="noopener noreferrer" target="_blank" className="font-semibold hover:text-brand-ink">
                        {r.personName}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-right text-base font-extrabold tabular-nums">{show(r.total)}</td>
                    {/* A smaller size than the total, so 17 Kinch columns fit a desktop page. No result: the Sum of Ranks
                        counts the event's penalty, Kinch counts 0; both shown in the muted colour. */}
                    {r.cells.map((c, i) =>
                      c === null ? (
                        <td key={data.events[i]} title={t('noResult')} className="px-1.5 py-3 text-center text-xs text-fg-2 tabular-nums">
                          {mode === 'sum' ? data.penalties[i] : show(0)}
                        </td>
                      ) : (
                        <td key={data.events[i]} className="px-1.5 py-3 text-center text-xs tabular-nums">
                          {show(c)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <RankingsPager params={params} last={last} link={link} />
        </>
      )}

      <RankingsSource date={date} ranked={!!data} />
    </div>
  )
}
