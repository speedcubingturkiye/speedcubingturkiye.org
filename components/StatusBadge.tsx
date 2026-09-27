// components/StatusBadge.tsx
import { useTranslations } from 'next-intl'
import type { RegistrationStatus } from '@/lib/wca/types'

// Outlined square label: text and 1px border in the status colour, no tinted fill (spec §3.3, AA in both themes)
const STYLE: Record<RegistrationStatus, string> = {
  open: 'border-ok text-ok',
  opens_soon: 'border-warn text-warn',
  closed: 'border-muted text-muted',
  full: 'border-brand text-brand-ink',
  past: 'border-muted text-muted',
}

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const t = useTranslations('competitions.status')
  // Optical centre for the uppercase label: 1px of padding moves from the bottom to the top, the tracking is added left
  return (
    <span className={`t-label inline-block whitespace-nowrap border pt-[5px] pr-2 pb-[3px] pl-[calc(0.5rem+0.08em)] ${STYLE[status]}`}>
      {t(status)}
    </span>
  )
}
