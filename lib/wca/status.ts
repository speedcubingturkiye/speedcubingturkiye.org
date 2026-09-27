// lib/wca/status.ts: pure functions, no I/O
import type { CompetitionDetail, CompetitionListItem, RegistrationStatus } from './types'

/** WCA competition ids: the URL trust boundary in getCompetition and the write-path guard in announceNew. */
export const WCA_ID_RE = /^[A-Za-z0-9]+$/

const ISTANBUL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 'YYYY-MM-DD' for the given instant in Europe/Istanbul (UTC+3 year-round). */
export function todayIstanbul(now: Date = new Date()): string {
  return ISTANBUL_DAY.format(now)
}

export function registrationStatus(
  comp: CompetitionListItem,
  detail?: CompetitionDetail | null,
  now: Date = new Date(),
): RegistrationStatus {
  const today = todayIstanbul(now)
  if (comp.end_date < today) return 'past'
  if (detail && (detail['registration_full?'] || detail.spots_left === 0)) return 'full'
  const t = now.getTime()
  const open = Date.parse(comp.registration_open)
  const close = Date.parse(comp.registration_close)
  if (t < open) return 'opens_soon'
  if (t < close) return 'open'
  return 'closed'
}

/**
 * What the WCA registration page offers now: 'register' while registration is open, 'waitingList' while the
 * competition is full but the window is still open (a new registration joins the waiting list), otherwise null.
 */
export function registerAction(
  comp: CompetitionListItem,
  detail?: CompetitionDetail | null,
  now: Date = new Date(),
): 'register' | 'waitingList' | null {
  const status = registrationStatus(comp, detail, now)
  if (status === 'open') return 'register'
  const t = now.getTime()
  const inWindow = t >= Date.parse(comp.registration_open) && t < Date.parse(comp.registration_close)
  return status === 'full' && inWindow ? 'waitingList' : null
}

/** start_date <= today <= end_date (Istanbul calendar days). */
export function isOngoing(comp: CompetitionListItem, now: Date = new Date()): boolean {
  const today = todayIstanbul(now)
  return comp.start_date <= today && today <= comp.end_date
}

/** competitor_limit - spots_left when both are numbers, else null. */
export function spotsTaken(detail: CompetitionDetail): number | null {
  if (detail.competitor_limit == null || detail.spots_left == null) return null
  return detail.competitor_limit - detail.spots_left
}
