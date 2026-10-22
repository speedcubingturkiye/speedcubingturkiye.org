// components/RankingsTable.tsx: a rankings table and the pages under it (2026-10-22), drawn the same way for the page
// the server renders and for the browser's instant search results (components/RankingsSearch.tsx), so the two never
// differ when one takes over from the other. No server-only code here.
import type { ComponentProps } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Pager } from '@/components/Pager'
import type { ListKind, ListRow } from '@/lib/rankings-list'
import { PAGE_SIZES, pageAfterResize, type ListParams } from '@/lib/rankings-view'
import { WCA_BASE } from '@/lib/wca/client'
import { formatResult } from '@/lib/wca/format'
import { EVENTS, eventNameLang } from '@/lib/wca/records'

// Segmented switch item: the per-page switch, as the panel's
// (optical centre of the uppercase label: 1px of padding moves from the bottom to the top, the tracking is added left)
const SEGMENT =
  't-label pt-[11px] pr-4 pb-[9px] pl-[calc(1rem+0.08em)] text-fg-2 hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg'
const NUMBER_TAG: Record<Locale, string> = { tr: 'tr-TR', en: 'en-GB' }

type TableProps = {
  kind: ListKind
  /** the rows to show (one page) */
  rows: ListRow[]
  /** a province's list: its own rank first, the national one beside it */
  il: boolean
  locale: Locale
}

export function RankingsTable({ kind, rows, il, locale }: TableProps) {
  const t = useTranslations('rankings')
  // An event's result as the WCA writes it; a Sum of Ranks whole; a Kinch score with two decimals in the page's
  // language (71,71 / 71.71)
  const decimals = new Intl.NumberFormat(NUMBER_TAG[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const show = (n: number) =>
    kind.mode === 'event' ? formatResult(n, kind.eventId, kind.type) : kind.mode === 'kinch' ? decimals.format(n / 100) : String(n)
  const name = (id: string) => EVENTS.find((e) => e.id === id)?.name[locale] ?? id
  const person = (r: ListRow) => (
    <a href={`${WCA_BASE}/persons/${r.personId}`} rel="noopener noreferrer" target="_blank" className="font-semibold hover:text-brand-ink">
      {r.personName}
    </a>
  )

  return (
    // Wider than a phone (the all-round lists): the table scrolls sideways within the page
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
            {kind.mode === 'event' ? (
              <th scope="col" className="py-2">
                {t('result')}
              </th>
            ) : (
              <>
                <th scope="col" className="py-2 pr-4 text-right">
                  {t(kind.mode === 'sum' ? 'total' : 'score')}
                </th>
                {/* relative: the sr-only name is positioned within its cell, so it scrolls with the table instead of
                    widening the page */}
                {kind.events.map((id) => (
                  <th key={id} scope="col" title={name(id)} className="relative px-1.5 py-2 text-center">
                    <span className={`cubing-icon event-${id} text-lg leading-none`} aria-hidden="true" />
                    <span className="sr-only" lang={eventNameLang(id)}>
                      {name(id)}
                    </span>
                  </th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.personId} className="border-b border-line">
              <td className="py-3 pr-3 font-bold tabular-nums">{r.provincePos ?? r.pos}</td>
              {il ? <td className="py-3 pr-3 text-fg-2 tabular-nums">{r.pos}</td> : null}
              {kind.mode === 'event' ? (
                <>
                  <td className="py-3 pr-3">
                    {person(r)}
                    {r.pos === 1 && (
                      <span className="t-label ml-2 inline-block bg-brand px-1.5 py-0.5 align-[1px] text-[11px] leading-none text-white">{t('nr')}</span>
                    )}
                  </td>
                  <td className="py-3 text-base font-extrabold tabular-nums">{show(r.value)}</td>
                </>
              ) : (
                <>
                  {/* min-w-36: on a phone a long name takes two lines, so the first event columns show beside it and
                      tell that the table goes on sideways */}
                  <td className="min-w-36 py-3 pr-3">{person(r)}</td>
                  <td className="py-3 pr-4 text-right text-base font-extrabold tabular-nums">{show(r.value)}</td>
                  {/* A smaller size than the total, so 17 Kinch columns fit a desktop page. No result: the Sum of Ranks
                      counts the event's penalty, Kinch counts 0; both shown in the muted colour. */}
                  {(r.cells ?? []).map((c, i) =>
                    c === null ? (
                      <td key={kind.events[i]} title={t('noResult')} className="px-1.5 py-3 text-center text-xs text-fg-2 tabular-nums">
                        {kind.mode === 'sum' ? kind.penalties[i] : show(0)}
                      </td>
                    ) : (
                      <td key={kind.events[i]} className="px-1.5 py-3 text-center text-xs tabular-nums">
                        {show(c)}
                      </td>
                    ),
                  )}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type PagerProps = {
  params: ListParams
  last: number
  /** the link to this list with some parameters changed */
  link: (change: Partial<ListParams>) => ComponentProps<typeof Link>['href']
}

/** Under a list: the pages, and the page size. */
export function RankingsPager({ params, last, link }: PagerProps) {
  const t = useTranslations('rankings')
  const { page, size } = params
  return (
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
  )
}
