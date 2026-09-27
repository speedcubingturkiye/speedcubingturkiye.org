// components/EventIcons.tsx
import { useLocale } from 'next-intl'
import { EVENTS } from '@/lib/wca/records'

/** @cubing/icons CSS font: <span class="cubing-icon event-333">. First `max` events + "+N". */
export function EventIcons({ eventIds, max = 6 }: { eventIds: string[]; max?: number }) {
  const locale = useLocale()
  const shown = eventIds.slice(0, max)
  const rest = eventIds.length - shown.length
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {shown.map((id) => {
        const name = EVENTS.find((e) => e.id === id)?.name[locale] ?? id
        return (
          <li key={id}>
            <span className={`cubing-icon event-${id} text-xl leading-none`} role="img" aria-label={name} title={name} />
          </li>
        )
      })}
      {rest > 0 && <li className="text-xs font-semibold text-fg-2">+{rest}</li>}
    </ul>
  )
}
