// components/CompetitionDetailView.tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { RegisterButton } from '@/components/CompetitionRow'
import { EventIcons } from '@/components/EventIcons'
import { StatusBadge } from '@/components/StatusBadge'
import { WcaTabs } from '@/components/WcaTabs'
import { displayCity } from '@/lib/wca/city'
import { WCA_BASE } from '@/lib/wca/client'
import { formatDateRange, formatDateTime, formatFee } from '@/lib/wca/format'
import { parseLinks } from '@/lib/wca/markdown'
import { EVENTS } from '@/lib/wca/records'
import { registerAction, registrationStatus, spotsTaken, todayIstanbul } from '@/lib/wca/status'
import type { CompetitionDetail, WcaPerson } from '@/lib/wca/types'

const LIVE_LINK = 'https://live.worldcubeassociation.org/link/competitions'

function PersonList({ people }: { people: WcaPerson[] }) {
  return (
    <ul className="mt-3 space-y-1">
      {people.map((p) => (
        <li key={p.id}>
          {p.wca_id ? (
            <a href={`${WCA_BASE}/persons/${p.wca_id}`} rel="noopener noreferrer" target="_blank" className="underline hover:text-brand-ink">
              {p.name}
            </a>
          ) : (
            p.name
          )}
        </li>
      ))}
    </ul>
  )
}

/** A WCA venue field: its Markdown links ([text](url)) open as links, the rest is plain text. */
function VenueText({ text }: { text: string }) {
  return parseLinks(text).map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : (
      <a key={i} href={part.href} rel="noopener noreferrer" target="_blank" className="underline hover:text-brand-ink">
        {part.text}
      </a>
    ),
  )
}

export function CompetitionDetailView({ comp, locale }: { comp: CompetitionDetail; locale: Locale }) {
  const t = useTranslations('competitions')
  const status = registrationStatus(comp, comp)
  const action = registerAction(comp, comp)
  const today = todayIstanbul()
  // WCA Live button only from the day before start_date through end_date and only for wca_live scoretaking.
  const dayBefore = new Date(new Date(`${comp.start_date}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10)
  const showLive = comp.scoretaking_software === 'wca_live' && today >= dayBefore && today <= comp.end_date
  const taken = spotsTaken(comp)
  const fee = formatFee(comp.base_entry_fee_lowest_denomination, comp.currency_code)

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      {/* The chevron (the pager's and the hero carousel's) marks the label as a way back. Its 14px box leaves 4px of air
          each side of the stroke: -ml-1 puts the stroke on the column edge, and it sits 1px up at the caps' optical
          centre (DESIGN.md, "Optical centring") */}
      <Link href="/yarismalar" className="t-label inline-flex items-center gap-0.5 text-fg-2 hover:text-fg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="-ml-1 -translate-y-px">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t('detailBack')}
      </Link>

      {/* 1. Title. A WCA name mixes English and Turkish words ("İstanbul April"), so no single lang can uppercase it
          right: it keeps its own case (R8). */}
      <header className="mt-4">
        <h1 className="normal-case">{comp.name}</h1>
        <p className="mt-2 text-lg text-fg-2">
          {formatDateRange(comp.start_date, comp.end_date, locale)} · {displayCity(comp.city)}
        </p>
      </header>

      {/* 2. Status box (past → results link) */}
      <section className="mt-8 border border-line bg-bg-2 p-6">
        {status === 'past' ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StatusBadge status={status} />
            <a href={`${comp.url}/results/all`} rel="noopener noreferrer" target="_blank" className="btn btn-brand">
              {t('resultsTitle')}
            </a>
          </div>
        ) : (
          // Details at the left, buttons at the right from md (stacked below on narrower screens)
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={status} />
                <span className="text-sm text-fg-2">
                  {t('registrationWindow', {
                    open: formatDateTime(comp.registration_open, locale),
                    close: formatDateTime(comp.registration_close, locale),
                  })}
                </span>
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {taken != null && (
                  <div>
                    <dt className="t-label text-fg-2">{t('spots')}</dt>
                    <dd className="text-lg font-bold">{comp['registration_full?'] ? t('status.full') : t('spotsOf', { taken, limit: comp.competitor_limit ?? 0 })}</dd>
                  </div>
                )}
                {fee && (
                  <div>
                    <dt className="t-label text-fg-2">{t('fee')}</dt>
                    <dd className="text-lg font-bold">{fee}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 md:justify-end">
              {action ? (
                <RegisterButton comp={comp} label={t(action === 'register' ? 'registerWca' : 'joinWaitingList')} />
              ) : (
                <a href={comp.url} rel="noopener noreferrer" target="_blank" className="btn btn-brand">
                  {t('wcaPage')}
                </a>
              )}
              {showLive && (
                // English product name: lang keeps the uppercase label from dotting the i (WCA LIVE, not WCA LİVE)
                <a href={`${LIVE_LINK}/${comp.id}`} rel="noopener noreferrer" target="_blank" lang="en" className="btn btn-outline">
                  {t('wcaLive')}
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 3. Events */}
      <section className="mt-10">
        <h2>{t('events')}</h2>
        <div className="mt-3">
          <EventIcons eventIds={comp.event_ids} max={99} />
        </div>
        <p className="mt-2 text-sm text-fg-2">{comp.event_ids.map((id) => EVENTS.find((e) => e.id === id)?.name[locale] ?? id).join(' · ')}</p>
      </section>

      {/* 4. Venue */}
      <section className="mt-10">
        <h2>{t('venue')}</h2>
        <p className="mt-3 font-semibold">
          <VenueText text={comp.venue} />
        </p>
        {comp.venue_address && <p className="text-fg-2">{comp.venue_address}</p>}
        {comp.venue_details && (
          <p className="text-fg-2">
            <VenueText text={comp.venue_details} />
          </p>
        )}
        <a
          href={`https://www.google.com/maps?q=${comp.latitude_degrees},${comp.longitude_degrees}`}
          rel="noopener noreferrer"
          target="_blank"
          className="mt-2 inline-block font-semibold text-brand-ink underline"
        >
          {t('openMap')}
        </a>
      </section>

      {/* 5. Delegates and organizers, each its own section: names from WCA data only, linked to WCA profiles. Side by
          side only where both fit one line (flex-wrap): half the column is too narrow for the 36px wide-cut
          "ORGANİZATÖRLER", which would otherwise break. */}
      <div className="mt-10 flex flex-wrap gap-x-16 gap-y-10">
        <section>
          <h2>{t('delegates')}</h2>
          <PersonList people={comp.delegates} />
        </section>
        <section>
          <h2>{t('organizers')}</h2>
          <PersonList people={comp.organizers} />
        </section>
      </div>

      {/* 6. The organizers' tabs from the WCA page, their text shown here (WcaTabs) */}
      {comp.tab_names && comp.tab_names.length > 0 && <WcaTabs comp={comp} locale={locale} />}

      {/* 7. Disclaimer */}
      <p className="mt-10 text-xs text-fg-2">{t('disclaimer')}</p>
    </article>
  )
}
