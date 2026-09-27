// lib/wca/format.ts
import type { Locale } from '@/i18n/routing'

const TAG: Record<Locale, string> = { tr: 'tr-TR', en: 'en-GB' }
const TZ = 'Europe/Istanbul'

function fmt(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(TAG[locale], { timeZone: TZ, ...options })
}

/** 'YYYY-MM-DD' → a Date at noon UTC (15:00 Istanbul) so the calendar day never shifts. */
function day(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`)
}

/** '2026-10-31' → '31 Ekim 2026' / '31 October 2026' */
export function formatDate(isoDate: string, locale: Locale): string {
  return fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(day(isoDate))
}

/** '2026-10-31','2026-11-01' → '31 Ekim – 1 Kasım 2026'; same day → single date. */
export function formatDateRange(start: string, end: string, locale: Locale): string {
  if (start === end) return formatDate(start, locale)
  return fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).formatRange(day(start), day(end))
}

/** ISO datetime → '26 Eylül 12:00' / '26 September, 12:00' in Istanbul time (registration windows). */
export function formatDateTime(iso: string, locale: Locale): string {
  return fmt(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** 'YYYY-MM' or 'YYYY-MM-DD' → 'Ekim 2026' (long) or 'Eki' (short). */
export function formatMonth(iso: string, locale: Locale, style: 'short' | 'long' = 'long'): string {
  const d = day(`${iso.slice(0, 7)}-15`)
  return style === 'long'
    ? fmt(locale, { month: 'long', year: 'numeric' }).format(d)
    : fmt(locale, { month: 'short' }).format(d)
}

function formatCentiseconds(cs: number): string {
  const m = Math.floor(cs / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  const sc = `${String(s).padStart(m ? 2 : 1, '0')}.${String(c).padStart(2, '0')}`
  return m ? `${m}:${sc}` : sc
}

/** WCA multi-blind encoding (new format 0DDTTTTTMM; old format 1SSAATTTTT). */
function formatMultiBlind(value: number): string {
  const s = String(value).padStart(10, '0')
  let solved: number
  let attempted: number
  let seconds: number
  if (s[0] === '1') {
    solved = 99 - Number(s.slice(1, 3))
    attempted = Number(s.slice(3, 5))
    seconds = Number(s.slice(5, 10))
  } else {
    const missed = Number(s.slice(8, 10))
    solved = 99 - Number(s.slice(1, 3)) + missed
    attempted = solved + missed
    seconds = Number(s.slice(3, 8))
  }
  return `${solved}/${attempted} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** -1 → DNF, -2 → DNS, 0 → an em dash placeholder; 333fm single = moves, average = value/100; 333mbf decoded; everything else centiseconds. */
export function formatResult(value: number, eventId: string, kind: 'single' | 'average'): string {
  if (value === -1) return 'DNF'
  if (value === -2) return 'DNS'
  if (value <= 0) return '—'
  if (eventId === '333fm') return kind === 'average' ? (value / 100).toFixed(2) : String(value)
  if (eventId === '333mbf') return formatMultiBlind(value)
  return formatCentiseconds(value)
}

/** 70000,'TRY' → '₺700'; 1500,'EUR' → '15 EUR'; null → ''. */
export function formatFee(lowest: number | null, currency: string): string {
  if (lowest == null) return ''
  const n = lowest / 100
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return currency === 'TRY' ? `₺${amount}` : `${amount} ${currency}`
}
