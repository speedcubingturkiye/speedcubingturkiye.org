// components/RankingsView.tsx: body of both event rankings routes (spec §5; full rankings spec §7). The choices sit in
// one panel (2026-10-21, components/RankingsParts.tsx): the list, the event grid, then the province, the type and the
// search, which narrows the list in the browser on every key (2026-10-22, components/RankingsSearch.tsx).
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { RankingsHeader, RankingsPanel, RankingsSource } from '@/components/RankingsParts'
import { RankingsSearchScope, SearchCount, SearchResults } from '@/components/RankingsSearch'
import { RankingsPager, RankingsTable } from '@/components/RankingsTable'
import { narrowRows } from '@/lib/il-ranking'
import { eventListRows, listParam, type ListKind } from '@/lib/rankings-list'
import { listQuery, pageCount, rowRange, type ListParams, type SearchParamsRecord } from '@/lib/rankings-view'
import { ABROAD } from '@/lib/wca/city'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDate } from '@/lib/wca/format'
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

export async function RankingsView({ eventId, type, rankings, locale, searchParams }: Props) {
  const t = await getTranslations('rankings')
  const event = EVENTS.find((e) => e.id === eventId)
  const all = rankings?.rows ?? []
  // ?il narrows the list to one province's members, numbered again within it (spec 2026-10-21, Parça 2); "Sıramı bul"
  // filters what is left (everyone keeps their rank) and the page is clamped to the filtered list.
  const { rows, params, province: place, unavailable } = await narrowRows(all, searchParams)
  const province = place === ABROAD ? t('abroad') : place
  const { page, size, query, il } = params
  const pathname = rankingsHref(eventId, type)
  // Links keep the current page, size and search unless told otherwise; the defaults stay out of the URL.
  const link = (change: Partial<ListParams>) => ({ pathname, query: listQuery({ ...params, ...change }) })
  const last = pageCount(rows.length, size)
  const { from, to } = rowRange(page, size, rows.length)
  const date = formatDate(rankings ? rankings.exportDate.slice(0, 10) : todayIstanbul(), locale)
  const wcaHref = `${WCA_BASE}/results/rankings/${eventId}/${type}?region=Turkey`
  const kind: ListKind = { mode: 'event', eventId, type }
  const source = `/api/siralamalar?${new URLSearchParams({ liste: listParam(kind), ...(il ? { il } : {}) })}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <RankingsSearchScope source={source} pathname={pathname} params={params}>
        <RankingsHeader />
        <RankingsPanel mode="event" eventId={eventId} type={type} pathname={pathname} params={params} locale={locale} />

        {/* What the list shows: the event, the type and the province, the count beside them */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 lang={eventNameLang(eventId)}>{event?.name[locale] ?? eventId}</h2>
            <p className="mt-1 text-fg-2">{province ? `${t(type)} · ${province}` : t(type)}</p>
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

        {!rankings ? (
          <div className="mt-6">
            <DataUnavailable href={wcaHref} />
          </div>
        ) : all.length === 0 ? (
          <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">{t('noResults')}</p>
        ) : (
          <SearchResults kind={kind} il={il !== ''} locale={locale}>
            {rows.length === 0 ? (
              <p className="mt-6 border border-line bg-bg-2 p-6 font-semibold">
                {unavailable ? t('provinceUnavailable') : query ? t('searchNone', { query }) : t('provinceNone', { province })}
              </p>
            ) : (
              <>
                {/* One page of plain server-rendered rows (the filtered list while searching) */}
                <RankingsTable kind={kind} rows={eventListRows(rows.slice(from - 1, to))} il={il !== ''} locale={locale} />
                <RankingsPager params={params} last={last} link={link} />
              </>
            )}
          </SearchResults>
        )}

        <RankingsSource date={date} ranked={!!rankings} />
      </RankingsSearchScope>
    </div>
  )
}
