// lib/membership-rules.ts: the Üye ol form's rules (04.2026.01 madde 1-2, spec 2026-10-19 §2), shared by the form and
// the server action, so nothing here may import server-only code.
import { EMAIL_RE } from '@/app/actions/types'
import { PROVINCES } from '@/lib/wca/city'

/** The city list's last choice; the sheet stores it in Turkish whatever the page's language. */
export const ABROAD = 'Yurt dışı'
/** The 81 provinces in Turkish alphabetical order (Kırıkkale before Kilis, Şanlıurfa after Sivas), for the form's list */
export const PROVINCE_CHOICES = [...PROVINCES].sort(new Intl.Collator('tr').compare)
export const WCA_ID_RE = /^\d{4}[A-Z]{4}\d{2}$/
// A letter first, so a name can never start a spreadsheet formula (=, +, -, @)
const NAME_RE = /^\p{L}[\p{L}\p{M} .'’-]*$/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type Application = {
  firstName: string
  lastName: string
  email: string
  /** YYYY-MM-DD */
  birthDate: string
  /** the parent or guardian box (madde 2), ticked by someone under 18; always false for an adult */
  guardian: boolean
  city: string
  /** '' when not given */
  wcaId: string
  /** "Yarışmalara yardım etmek istiyorum" */
  helps: boolean
}
export type ApplicationError = 'invalid' | 'guardian'

/** Whole years between two YYYY-MM-DD dates; someone born on 29 February turns a year older on 1 March. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

/** A real calendar day written YYYY-MM-DD (2026-02-30 is not). */
function isDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** The form's fields, checked; `today` is the Istanbul date (todayIstanbul). */
export function parseApplication(
  formData: FormData,
  today: string,
): { ok: true; data: Application } | { ok: false; error: ApplicationError } {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const firstName = text('firstName')
  const lastName = text('lastName')
  const email = text('email').toLowerCase()
  const birthDate = text('birthDate')
  const city = text('city')
  const wcaId = text('wcaId').toUpperCase()
  const valid =
    [firstName, lastName].every((name) => name.length <= 60 && NAME_RE.test(name)) &&
    EMAIL_RE.test(email) && email.length <= 254 &&
    isDate(birthDate) && birthDate >= '1900-01-01' && birthDate <= today &&
    (PROVINCES.includes(city) || city === ABROAD) &&
    (wcaId === '' || WCA_ID_RE.test(wcaId))
  if (!valid) return { ok: false, error: 'invalid' }
  const minor = ageOn(birthDate, today) < 18
  const guardian = formData.get('guardian') === 'on'
  if (minor && !guardian) return { ok: false, error: 'guardian' }
  return {
    ok: true,
    data: { firstName, lastName, email, birthDate, guardian: minor && guardian, city, wcaId, helps: formData.get('helps') === 'on' },
  }
}
