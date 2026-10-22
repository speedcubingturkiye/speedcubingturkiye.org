// components/RankingsParts.tsx: what every rankings list shares (2026-10-22): the title, the panel of choices and the
// data source. The event lists (RankingsView) and the all-round lists (AllRoundView) put their own table between them
// (components/RankingsTable.tsx, with the pages under it).
import { getTranslations } from 'next-intl/server'
import { getPathname, Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ProvinceSelect } from '@/components/ProvinceSelect'
import { RankingsSearch } from '@/components/RankingsSearch'
import { PROVINCE_CHOICES } from '@/lib/membership-rules'
import { DEFAULT_SIZE, listQuery, type ListParams } from '@/lib/rankings-view'
import { provinceSlug } from '@/lib/wca/city'
import { KINCH_HREF, rankingsHref, sumOfRanksHref, type RankingType } from '@/lib/wca/rankings'
import { EVENTS, eventNameLang } from '@/lib/wca/records'

/** Which list a rankings page shows: one event's, the Sum of Ranks, or Kinch. */
export type RankingsMode = 'event' | 'sum' | 'kinch'

// Segmented switch item: the single/average switch (the per-page switch, in RankingsTable.tsx, is the same)
// (optical centre of the uppercase label: 1px of padding moves from the bottom to the top, the tracking is added left)
const SEGMENT =
  't-label pt-[11px] pr-4 pb-[9px] pl-[calc(1rem+0.08em)] text-fg-2 hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg'
// The list switch: the same item, with little side padding on a phone so its three labels keep one line at 320px
// ("Sum of ranks" in English); flex-auto shares out the room left
const MODE =
  't-label flex-auto px-1 pt-[11px] pb-[9px] text-center text-fg-2 hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg sm:pr-4 sm:pl-[calc(1rem+0.08em)]'
// An event in the grid: the icon alone (its name in aria-label and title), the current one in the brand red. Below lg
// a square as wide as its column, from lg 44px.
const EVENT =
  'flex aspect-square w-full items-center justify-center border border-line bg-bg text-fg-2 hover:border-fg hover:text-fg aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white lg:size-11'
// A field's label in the panel
const LABEL = 't-label mb-2 block text-fg-2'

/** A localized path with a query object, for a plain href. */
const withQuery = (path: string, query: Record<string, string>) => {
  const qs = new URLSearchParams(query).toString()
  return qs ? `${path}?${qs}` : path
}

export async function RankingsHeader() {
  const t = await getTranslations('rankings')
  return (
    <header className="mb-6">
      <h1>{t('title')}</h1>
      <p className="mt-2 max-w-2xl text-fg-2">{t('description')}</p>
    </header>
  )
}

type PanelProps = {
  mode: RankingsMode
  /** the event list's event (the Sum of Ranks and Kinch cover them all) */
  eventId?: string
  /** single or average; Kinch has neither */
  type?: RankingType
  /** this list's path, where the province and the search forms send their choice */
  pathname: string
  params: ListParams
  locale: Locale
}

/** The choices above a list (2026-10-21): the list, the event grid, then the province, the type and the search. */
export async function RankingsPanel({ mode, eventId = '333', type, pathname, params, locale }: PanelProps) {
  const t = await getTranslations('rankings')
  const { size, query, il } = params
  const action = getPathname({ locale, href: pathname })
  const keepSize: Record<string, string> = size !== DEFAULT_SIZE ? { boyut: String(size) } : {}
  // Another list keeps the province and the page size; the event list starts again at 3x3x3, with the type kept
  const modes: [RankingsMode, string, string][] = [
    ['event', rankingsHref(mode === 'event' ? eventId : '333', type ?? 'single'), t('modeEvent')],
    ['sum', sumOfRanksHref(type ?? 'single'), t('modeSum')],
    ['kinch', KINCH_HREF, t('modeKinch')],
  ]
  // The type switch: an event's own types (4BLD, 5BLD and MBLD have no average), both for the Sum of Ranks, none for Kinch
  const types: RankingType[] =
    mode === 'kinch' ? [] : mode === 'sum' || EVENTS.find((e) => e.id === eventId)?.hasAverage ? ['single', 'average'] : ['single']
  const typeHref = (s: RankingType) => (mode === 'sum' ? sumOfRanksHref(s) : rankingsHref(eventId, s))

  return (
    <section aria-label={t('filters')} className="border border-line bg-bg-2 p-5">
      <div>
        <span id="rankings-mode" className={LABEL}>
          {t('mode')}
        </span>
        <div role="group" aria-labelledby="rankings-mode" className="flex border border-line bg-bg sm:inline-flex">
          {modes.map(([m, href, label]) => (
            <Link
              key={m}
              href={{ pathname: href, query: listQuery({ page: 1, size, query: '', il }) }}
              aria-current={m === mode ? 'page' : undefined}
              // Kinch is a name: CSS uppercase must not dot it on a Turkish page (KINCH, not KİNCH; R8)
              lang={m === 'kinch' ? 'en' : undefined}
              className={MODE}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Events: the grid wraps instead of scrolling; an event keeps the type where it has one (4BLD, 5BLD and MBLD
          have no average) and the province. Below lg nine to a row, two rows as on the WCA's phone page (2026-10-22;
          max-w-xs keeps a cell at 32px at most); from lg one row. */}
      {mode === 'event' ? (
        <nav aria-labelledby="rankings-events" className="mt-6">
          <span id="rankings-events" className={LABEL}>
            {t('event')}
          </span>
          <ul className="grid max-w-xs grid-cols-9 gap-1 lg:flex lg:max-w-none lg:flex-wrap lg:gap-1.5">
            {EVENTS.map((e) => (
              <li key={e.id}>
                <Link
                  href={rankingsHref(e.id, e.hasAverage ? (type ?? 'single') : 'single') + (il ? `?il=${il}` : '')}
                  aria-label={e.name[locale]}
                  title={e.name[locale]}
                  lang={eventNameLang(e.id)}
                  aria-current={e.id === eventId ? 'page' : undefined}
                  className={EVENT}
                >
                  <span className={`cubing-icon event-${e.id} text-lg leading-none lg:text-2xl`} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* grid-cols-1 (minmax(0, 1fr)): the select's longest province name must not widen the column past the panel */}
      <div
        className={
          types.length > 0
            ? 'mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)]'
            : 'mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'
        }
      >
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
            {query && <input type="hidden" name="ara" value={query} />}
            <noscript>
              <button type="submit" className="btn btn-outline">
                {t('provinceShow')}
              </button>
            </noscript>
          </div>
        </form>

        {/* Switching the type keeps the page size, the search and the province, and starts at page 1 */}
        {types.length > 0 ? (
          <div>
            <span id="rankings-type" className={LABEL}>
              {t('type')}
            </span>
            <div role="group" aria-labelledby="rankings-type" className="flex border border-line bg-bg">
              {types.map((s) => (
                <Link
                  key={s}
                  href={{ pathname: typeHref(s), query: listQuery({ page: 1, size, query, il }) }}
                  aria-current={s === type ? 'page' : undefined}
                  className={`${SEGMENT} flex-1 text-center`}
                >
                  {t(s)}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* "Sıramı bul": lists on every key (components/RankingsSearch.tsx); a search keeps the province and the page
            size and starts at page 1 */}
        <RankingsSearch
          action={action}
          keep={{ ...keepSize, ...(il ? { il } : {}) }}
          clearHref={withQuery(action, listQuery({ ...params, page: 1, query: '' }))}
          labels={{ label: t('searchLabel'), placeholder: t('searchPlaceholder'), button: t('searchButton'), clear: t('searchClear') }}
        />
      </div>

      {il ? (
        <p className="mt-4 text-sm text-fg-2">
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
  )
}

/** The WCA attribution: it names the export the data comes from (its README asks for "as of <export date>"). */
export async function RankingsSource({ date, ranked }: { date: string; ranked: boolean }) {
  const t = await getTranslations('rankings')
  return (
    <section className="mt-10 border border-line bg-bg-2 p-5 text-xs text-fg-2">
      <h2 className="t-label text-fg">{t('attributionIntro')}</h2>
      <p className="mt-2" lang="en">
        {t('attribution', { date })}
      </p>
      <p className="mt-1" lang="tr">
        {t('attributionTr', { date })}
      </p>
      {ranked && <p className="mt-2">{t('rankSource')}</p>}
    </section>
  )
}
