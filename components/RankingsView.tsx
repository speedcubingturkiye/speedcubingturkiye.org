// components/RankingsView.tsx: body of both rankings routes (spec §5; full rankings spec §7). The choices sit in one
// panel (2026-10-21): the event grid, then the province, the type and the search.
import { getTranslations } from 'next-intl/server'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { Pager } from '@/components/Pager'
import { ProvinceSelect } from '@/components/ProvinceSelect'
import { provinceMembers, provinceRows } from '@/lib/il-ranking'
import { PROVINCE_CHOICES } from '@/lib/membership-rules'
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
import { PROVINCE_BY_SLUG, provinceSlug } from '@/lib/wca/city'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDate, formatResult } from '@/lib/wca/format'
import { rankingsHref, type Rankings, type RankingType } from '@/lib/wca/rankings'
import { EVENTS, eventNameLang } from '@/lib/wca/records'
import { todayIstanbul } from '@/lib/wca/status'
import type { RankingRow } from '@/lib/wca/types'

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
// An event in the grid: the icon alone (its name in aria-label and title), the current one in the brand red
const EVENT =
  'flex h-11 w-11 items-center justify-center border border-line bg-bg text-fg-2 hover:border-fg hover:text-fg aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white'
// A field's label in the panel
const LABEL = 't-label mb-2 block text-fg-2'

export async function RankingsView({ eventId, type, rankings, locale, searchParams }: Props) {
  const t = await getTranslations('rankings')
  const event = EVENTS.find((e) => e.id === eventId)
  const all = rankings?.rows ?? []
  // ?il narrows the list to one province's members, numbered again within it (spec 2026-10-21, Parça 2)
  const { il } = parseListParams(searchParams, all.length)
  const byId = il ? await provinceMembers() : null
  const province = PROVINCE_BY_SLUG.get(il) ?? ''
  const base: (RankingRow & { provincePos?: number })[] = !il ? all : byId ? provinceRows(all, byId, il) : []
  // "Sıramı bul" filters the list itself (everyone keeps their rank); the page is clamped to the filtered list.
  const rows = filterRows(base, parseListParams(searchParams, base.length).query)
  const params = parseListParams(searchParams, rows.length)
  const { page, size, query } = params
  const pathname = rankingsHref(eventId, type)
  const action = getPathname({ locale, href: pathname })
  // Links keep the current page, size and search unless told otherwise; the defaults stay out of the URL.
  const link = (change: Partial<ListParams>) => ({ pathname, query: listQuery({ ...params, ...change }) })
  const last = pageCount(rows.length, size)
  const { from, to } = rowRange(page, size, rows.length)
  // The WCA attribution names the export the data comes from (its README asks for "as of <export date>").
  const date = formatDate(rankings ? rankings.exportDate.slice(0, 10) : todayIstanbul(), locale)
  const wcaHref = `${WCA_BASE}/results/rankings/${eventId}/${type}?region=Turkey`
  const types: RankingType[] = event?.hasAverage ? ['single', 'average'] : ['single']
  const keepSize: Record<string, string> = size !== DEFAULT_SIZE ? { boyut: String(size) } : {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1>{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-fg-2">{t('description')}</p>
      </header>

      <section aria-label={t('filters')} className="border border-line bg-bg-2 p-5">
        {/* Events: the grid wraps instead of scrolling; an event keeps the type where it has one (4BLD, 5BLD and MBLD
            have no average) and the province */}
        <nav aria-labelledby="rankings-events">
          <span id="rankings-events" className={LABEL}>
            {t('event')}
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {EVENTS.map((e) => (
              <li key={e.id}>
                <Link
                  href={rankingsHref(e.id, e.hasAverage ? type : 'single') + (il ? `?il=${il}` : '')}
                  aria-label={e.name[locale]}
                  title={e.name[locale]}
                  lang={eventNameLang(e.id)}
                  aria-current={e.id === eventId ? 'page' : undefined}
                  className={EVENT}
                >
                  <span className={`cubing-icon event-${e.id} text-2xl leading-none`} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* grid-cols-1 (minmax(0, 1fr)): the select's longest province name must not widen the column past the panel */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)]">
          {/* İl sıralaması (spec 2026-10-21, Parça 2): applies on choosing; without JS the form's button does */}
          <form action={action} method="get">
            <label htmlFor="rankings-province" className={LABEL}>
              {t('province')}
            </label>
            <div className="flex gap-2">
              {/* The city select's drawn arrow, as in the Üye ol form */}
              <span className="relative block min-w-0 flex-1">
                <ProvinceSelect
                  id="rankings-province"
                  value={il}
                  action={action}
                  keep={keepSize}
                  allLabel={t('allProvinces')}
                  options={PROVINCE_CHOICES.map((p) => ({ value: provinceSlug(p), label: p }))}
                />
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg">
                  <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              </span>
              {size !== DEFAULT_SIZE && <input type="hidden" name="boyut" value={size} />}
              <noscript>
                <button type="submit" className="btn btn-outline">
                  {t('provinceShow')}
                </button>
              </noscript>
            </div>
          </form>

          {/* Switching the type keeps the page size, the search and the province, and starts at page 1 */}
          <div>
            <span id="rankings-type" className={LABEL}>
              {t('type')}
            </span>
            <div role="group" aria-labelledby="rankings-type" className="flex border border-line bg-bg">
              {types.map((s) => (
                <Link
                  key={s}
                  href={{ pathname: rankingsHref(eventId, s), query: listQuery({ page: 1, size, query, il }) }}
                  aria-current={s === type ? 'page' : undefined}
                  className={`${SEGMENT} flex-1 text-center`}
                >
                  {t(s)}
                </Link>
              ))}
            </div>
          </div>

          {/* "Sıramı bul": a GET search (no JS; a search starts at page 1) */}
          <form action={action} method="get" role="search">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor="rankings-search" className={LABEL}>
                {t('searchLabel')}
              </label>
              {query && (
                <Link href={link({ page: 1, query: '' })} className="text-sm font-semibold text-brand-ink underline">
                  {t('searchClear')}
                </Link>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="rankings-search"
                type="search"
                name="ara"
                defaultValue={query}
                maxLength={MAX_QUERY}
                placeholder={t('searchPlaceholder')}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 border border-line bg-bg px-3 text-fg focus:border-fg"
              />
              {size !== DEFAULT_SIZE && <input type="hidden" name="boyut" value={size} />}
              {il && <input type="hidden" name="il" value={il} />}
              <button type="submit" className="btn btn-brand">
                {t('searchButton')}
              </button>
            </div>
          </form>
        </div>

        {il ? (
          <p className="mt-4 max-w-2xl text-sm text-fg-2">
            {t.rich('provinceNote', {
              join: (chunks) => (
                <Link href="/uye-ol" className="font-semibold text-brand-ink underline">
                  {chunks}
                </Link>
              ),
              account: (chunks) => (
                <Link href="/hesabim" className="font-semibold text-brand-ink underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : null}
      </section>

      {/* What the list shows: the event, the type and the province, the count beside them */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 lang={eventNameLang(eventId)}>{event?.name[locale] ?? eventId}</h2>
          <p className="mt-1 text-fg-2">{province ? `${t(type)} · ${province}` : t(type)}</p>
        </div>
        {rows.length > 0 ? (
          <p className="text-sm text-fg-2 tabular-nums">
            {query ? t('searchCount', { query, from, to, total: rows.length }) : t('count', { from, to, total: rows.length })}
          </p>
        ) : null}
      </div>

      {!rankings ? (
        <div className="mt-6">
          <DataUnavailable href={wcaHref} />
        </div>
      ) : all.length === 0 ? (
        <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">{t('noResults')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">
          {il && !byId ? t('provinceUnavailable') : query ? t('searchNone', { query }) : t('provinceNone', { province })}
        </p>
      ) : (
        <>
          {/* One page of plain server-rendered rows (the filtered list while searching) */}
          <div className="-mx-4 mt-4 overflow-x-auto px-4">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="t-label border-b-2 border-fg text-fg-2">
                  <th scope="col" className="w-12 py-2 pr-3">
                    {t('rank')}
                  </th>
                  {/* A province's list keeps the national rank beside its own */}
                  {il ? (
                    <th scope="col" className="w-20 py-2 pr-3">
                      {t('nationalRank')}
                    </th>
                  ) : null}
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
                    <td className="py-3 pr-3 font-bold tabular-nums">{r.provincePos ?? r.pos}</td>
                    {il ? <td className="py-3 pr-3 text-fg-2 tabular-nums">{r.pos}</td> : null}
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

          {/* Under the list: the pages, and the page size */}
          <div className="flex flex-wrap items-center justify-between gap-x-6">
            <Pager page={page} last={last} href={(p) => link({ page: p })} />
            <div className="mt-6 ml-auto flex items-center gap-3">
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
