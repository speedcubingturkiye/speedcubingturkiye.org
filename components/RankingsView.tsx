// components/RankingsView.tsx: body of both rankings routes (spec §5; full rankings spec §7)
import { getTranslations } from 'next-intl/server'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { Pager } from '@/components/Pager'
import { SectionNav } from '@/components/SectionNav'
import {
  DEFAULT_SIZE,
  filterRows,
  listQuery,
  MAX_QUERY,
  PAGE_SIZES,
  pageAfterResize,
  pageCount,
  parseListParams,
  rowRange,
  type ListParams,
  type SearchParamsRecord,
} from '@/lib/rankings-view'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDate, formatResult } from '@/lib/wca/format'
import { rankingsHref, type Rankings, type RankingType } from '@/lib/wca/rankings'
import { EVENTS, eventNameLang } from '@/lib/wca/records'
import { todayIstanbul } from '@/lib/wca/status'

type Props = {
  eventId: string
  type: RankingType
  /** null = no data files yet (only before the first export run); an event with no Türkiye result has empty rows */
  rankings: Rankings | null
  locale: Locale
  searchParams: SearchParamsRecord
}

// Segmented switch item: the single/average switch and the per-page switch
// (optical centre of the uppercase label: 1px of padding moves from the bottom to the top, the tracking is added left)
const SEGMENT =
  't-label pt-[11px] pr-4 pb-[9px] pl-[calc(1rem+0.08em)] text-fg-2 hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg'

export async function RankingsView({ eventId, type, rankings, locale, searchParams }: Props) {
  const t = await getTranslations('rankings')
  const event = EVENTS.find((e) => e.id === eventId)
  const all = rankings?.rows ?? []
  // "Sıramı bul" filters the list itself (everyone keeps their national rank); the page is clamped to the filtered list.
  const rows = filterRows(all, parseListParams(searchParams, all.length).query)
  const params = parseListParams(searchParams, rows.length)
  const { page, size, query } = params
  const pathname = rankingsHref(eventId, type)
  // Links keep the current page, size and search unless told otherwise; the defaults stay out of the URL.
  const link = (change: Partial<ListParams>) => ({ pathname, query: listQuery({ ...params, ...change }) })
  const last = pageCount(rows.length, size)
  const { from, to } = rowRange(page, size, rows.length)
  // The WCA attribution names the export the data comes from (its README asks for "as of <export date>").
  const date = formatDate(rankings ? rankings.exportDate.slice(0, 10) : todayIstanbul(), locale)
  const wcaHref = `${WCA_BASE}/results/rankings/${eventId}/${type}?region=Turkey`
  // Tabs keep the current type where the event has one (4BLD, 5BLD and MBLD have no average).
  const tabs = EVENTS.map((e) => ({
    href: rankingsHref(e.id, e.hasAverage ? type : 'single'),
    label: e.name[locale],
    icon: e.id,
    lang: eventNameLang(e.id),
  }))
  const types: RankingType[] = event?.hasAverage ? ['single', 'average'] : ['single']

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1>{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-fg-2">{t('description')}</p>
      </header>

      <SectionNav items={tabs} label={t('events')} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h2 lang={eventNameLang(eventId)}>{event?.name[locale] ?? eventId}</h2>
        {/* Switching the type keeps the page size and the search, and starts at page 1 */}
        <div role="group" aria-label={t('type')} className="flex border border-line">
          {types.map((s) => (
            <Link
              key={s}
              href={{ pathname: rankingsHref(eventId, s), query: listQuery({ page: 1, size, query }) }}
              aria-current={s === type ? 'page' : undefined}
              className={SEGMENT}
            >
              {t(s)}
            </Link>
          ))}
        </div>
      </div>

      {!rankings ? (
        <div className="mt-8">
          <DataUnavailable href={wcaHref} />
        </div>
      ) : all.length === 0 ? (
        <p className="mt-8 border border-line bg-bg-2 p-6 font-semibold">{t('noResults')}</p>
      ) : (
        <>
          {/* Tools: a GET search form (no JS; a search starts at page 1) and the per-page switch */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <form action={getPathname({ locale, href: pathname })} method="get" role="search" className="w-full max-w-md">
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor="rankings-search" className="block text-sm font-semibold">
                  {t('searchLabel')}
                </label>
                {query && (
                  <Link href={link({ page: 1, query: '' })} className="text-sm font-semibold text-brand-ink underline">
                    {t('searchClear')}
                  </Link>
                )}
              </div>
              <div className="mt-1 flex gap-2">
                <input
                  id="rankings-search"
                  type="search"
                  name="ara"
                  defaultValue={query}
                  maxLength={MAX_QUERY}
                  placeholder={t('searchPlaceholder')}
                  autoComplete="off"
                  className="min-w-0 flex-1 border border-line bg-bg px-3 py-2 text-fg focus:border-fg"
                />
                {size !== DEFAULT_SIZE && <input type="hidden" name="boyut" value={size} />}
                <button type="submit" className="btn btn-brand">
                  {t('searchButton')}
                </button>
              </div>
            </form>
            <div className="flex items-center gap-3">
              <span id="per-page" className="text-sm font-semibold">
                {t('perPage')}
              </span>
              <div role="group" aria-labelledby="per-page" className="flex border border-line">
                {PAGE_SIZES.map((s) => (
                  <Link
                    key={s}
                    href={link({ page: pageAfterResize(page, size, s), size: s })}
                    aria-current={s === size ? 'page' : undefined}
                    className={SEGMENT}
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="mt-8 border border-line bg-bg-2 p-6 font-semibold">{t('searchNone', { query })}</p>
          ) : (
            <>
              <p className="mt-6 text-sm text-fg-2 tabular-nums">
                {query ? t('searchCount', { query, from, to, total: rows.length }) : t('count', { from, to, total: rows.length })}
              </p>
              {/* One page of plain server-rendered rows (the filtered list while searching) */}
              <div className="-mx-4 mt-2 overflow-x-auto px-4">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="t-label border-b-2 border-fg text-fg-2">
                      <th scope="col" className="w-12 py-2 pr-3">
                        {t('rank')}
                      </th>
                      <th scope="col" className="py-2 pr-3">
                        {t('competitor')}
                      </th>
                      <th scope="col" className="py-2">
                        {t('result')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(from - 1, to).map((r) => (
                      <tr key={r.personId} className="border-b border-line">
                        <td className="py-3 pr-3 font-bold tabular-nums">{r.pos}</td>
                        <td className="py-3 pr-3">
                          <a href={`${WCA_BASE}/persons/${r.personId}`} rel="noopener noreferrer" target="_blank" className="font-semibold hover:text-brand-ink">
                            {r.personName}
                          </a>
                          {r.pos === 1 && (
                            <span className="t-label ml-2 inline-block bg-brand px-1.5 py-0.5 align-[1px] text-[11px] leading-none text-white">{t('nr')}</span>
                          )}
                        </td>
                        <td className="py-3 text-base font-extrabold tabular-nums">{formatResult(r.best, eventId, type)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager page={page} last={last} href={(p) => link({ page: p })} />
            </>
          )}
        </>
      )}

      <section className="mt-10 border border-line bg-bg-2 p-5 text-xs text-fg-2">
        <h2 className="t-label text-fg">{t('attributionIntro')}</h2>
        <p className="mt-2" lang="en">
          {t('attribution', { date })}
        </p>
        <p className="mt-1" lang="tr">
          {t('attributionTr', { date })}
        </p>
        {rankings && <p className="mt-2">{t('rankSource')}</p>}
      </section>
    </div>
  )
}
