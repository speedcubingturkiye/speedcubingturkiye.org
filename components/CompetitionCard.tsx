// components/CompetitionCard.tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { EventIcons } from '@/components/EventIcons'
import { RegisterButton, type CompetitionItemProps } from '@/components/CompetitionRow'
import { StatusBadge } from '@/components/StatusBadge'
import { displayCity } from '@/lib/wca/city'
import { formatDateRange } from '@/lib/wca/format'
import { registerAction, registrationStatus, spotsTaken } from '@/lib/wca/status'

/** Home-page card: date, name, city, icons, status, spots. Square, hairline, fg border on hover (spec §3.3). */
export function CompetitionCard({ comp, detail, locale }: CompetitionItemProps) {
  const t = useTranslations('competitions')
  const status = registrationStatus(comp, detail)
  const action = registerAction(comp, detail)
  const taken = detail ? spotsTaken(detail) : null

  return (
    <article className="flex h-full flex-col gap-3 border border-line bg-bg p-5 hover:border-fg">
      {/* Wraps: EN "REGISTRATION OPEN" (178px, nowrap) beside the date does not fit a 320px phone's card */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="t-label text-fg-2">{formatDateRange(comp.start_date, comp.end_date, locale)}</p>
        <StatusBadge status={status} />
      </div>
      <h3>
        <Link href={`/yarismalar/${comp.id}`} className="hover:text-brand-ink">
          {comp.name}
        </Link>
      </h3>
      <p className="text-sm text-fg-2">{displayCity(comp.city)}</p>
      {action && (
        <div>
          <RegisterButton comp={comp} label={t(action === 'register' ? 'registerWca' : 'joinWaitingList')} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <EventIcons eventIds={comp.event_ids} />
        {taken != null && <span className="text-sm text-fg-2">{t('spotsOf', { taken, limit: detail?.competitor_limit ?? 0 })}</span>}
      </div>
    </article>
  )
}
