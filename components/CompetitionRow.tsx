// components/CompetitionRow.tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { EventIcons } from '@/components/EventIcons'
import { StatusBadge } from '@/components/StatusBadge'
import { displayCity } from '@/lib/wca/city'
import { formatDateRange, formatFee, formatMonth } from '@/lib/wca/format'
import { registerAction, registrationStatus, spotsTaken } from '@/lib/wca/status'
import type { CompetitionDetail, CompetitionListItem } from '@/lib/wca/types'

export type CompetitionItemProps = { comp: CompetitionListItem; detail?: CompetitionDetail | null; locale: Locale }

/** The WCA registration page (registerAction: register, or join the waiting list); named with the competition for lists. */
export function RegisterButton({ comp, label }: { comp: CompetitionListItem; label: string }) {
  return (
    // max-w-full + wrapping: in the detail page's status box a 320px phone leaves 238px for the 256px TR label
    <a
      href={`${comp.url}/register`}
      rel="noopener noreferrer"
      target="_blank"
      aria-label={`${label}: ${comp.name}`}
      className="btn btn-brand max-w-full shrink-0 whitespace-normal text-center"
    >
      {label}
    </a>
  )
}

/** Calendar row: date block, name, city + range, event icons, status; upcoming rows add spots and fee. */
export function CompetitionRow({ comp, detail, locale }: CompetitionItemProps) {
  const t = useTranslations('competitions')
  const status = registrationStatus(comp, detail)
  const action = registerAction(comp, detail)
  const taken = detail ? spotsTaken(detail) : null
  const fee = detail ? formatFee(detail.base_entry_fee_lowest_denomination, detail.currency_code) : ''

  return (
    // items-start: on a phone the outlined status label keeps its own width instead of stretching across the row
    <li className="flex flex-col items-start gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:gap-6">
      {/* 5px/11px instead of py-2: the day's digits leave room above them in their line, which pushed the pair 3px low */}
      <div className="flex w-16 shrink-0 flex-col items-center border border-line pt-[5px] pb-[11px] leading-none">
        <span className="text-2xl font-extrabold">{Number(comp.start_date.slice(8, 10))}</span>
        <span className="t-label mt-1 text-fg-2">{formatMonth(comp.start_date, locale, 'short')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/yarismalar/${comp.id}`} className="text-lg font-bold hover:text-brand-ink">
          {comp.name}
        </Link>
        <p className="text-sm text-fg-2">
          {displayCity(comp.city)} · {formatDateRange(comp.start_date, comp.end_date, locale)}
        </p>
        {detail && (
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-fg-2">
            {taken != null && (
              <span>
                {t('spots')}: {t('spotsOf', { taken, limit: detail.competitor_limit ?? 0 })}
              </span>
            )}
            {fee && (
              <span>
                {t('fee')}: {fee}
              </span>
            )}
          </p>
        )}
      </div>
      <EventIcons eventIds={comp.event_ids} />
      <StatusBadge status={status} />
      {action && <RegisterButton comp={comp} label={t(action === 'register' ? 'registerWca' : 'joinWaitingList')} />}
    </li>
  )
}
