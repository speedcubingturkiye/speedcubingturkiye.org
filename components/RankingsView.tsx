// components/RankingsView.tsx: body of both event rankings routes (spec §5; full rankings spec §7). The choices sit in
// one panel (2026-10-21, components/RankingsParts.tsx): the list, the event grid, then the province, the type and the
// search.
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { DataUnavailable } from '@/components/DataUnavailable'
import { RankingsHeader, RankingsPager, RankingsPanel, RankingsSource } from '@/components/RankingsParts'
import { narrowRows } from '@/lib/il-ranking'
import { listQuery, pageCount, rowRange, type ListParams, type SearchParamsRecord } from '@/lib/rankings-view'
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

export async function RankingsView({ eventId, type, rankings, locale, searchParams }: Props) {
  const t = await getTranslations('rankings')
  const event = EVENTS.find((e) => e.id === eventId)
  const all = rankings?.rows ?? []
  // ?il narrows the list to one province's members, numbered again within it (spec 2026-10-21, Parça 2); "Sıramı bul"
  // filters what is left (everyone keeps their rank) and the page is clamped to the filtered list.
  const { rows, params, province, unavailable } = await narrowRows(all, searchParams)
  const { page, size, query, il } = params
  const pathname = rankingsHref(eventId, type)
  // Links keep the current page, size and search unless told otherwise; the defaults stay out of the URL.
  const link = (change: Partial<ListParams>) => ({ pathname, query: listQuery({ ...params, ...change }) })
  const last = pageCount(rows.length, size)
  const { from, to } = rowRange(page, size, rows.length)
  const date = formatDate(rankings ? rankings.exportDate.slice(0, 10) : todayIstanbul(), locale)
  const wcaHref = `${WCA_BASE}/results/rankings/${eventId}/${type}?region=Turkey`

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <RankingsHeader />
      <RankingsPanel mode="event" eventId={eventId} type={type} pathname={pathname} params={params} locale={locale} />

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
          {unavailable ? t('provinceUnavailable') : query ? t('searchNone', { query }) : t('provinceNone', { province })}
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

          <RankingsPager params={params} last={last} link={link} />
        </>
      )}

      <RankingsSource date={date} ranked={!!rankings} />
    </div>
  )
}
