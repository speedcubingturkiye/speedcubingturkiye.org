// lib/membership.ts: Üye ol (spec 2026-10-19 §3). An application goes to the sheet as "Onay bekliyor" and the applicant
// gets the confirm link; the link makes the row "Üye". The rules live in lib/membership-rules.ts, the sheet calls in
// lib/membership-sheet.ts, the mail bodies in lib/mail-render.ts.
import { randomBytes } from 'node:crypto'
import type { Locale } from '@/i18n/routing'
import { renderAlreadyMemberMail, renderMembershipConfirmMail } from '@/lib/mail-render'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'

// sv-SE writes the ISO order: "2026-10-19 14:05"
const STAMP = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
// 32 random bytes as base64url
const TOKEN_RE = /^[\w-]{43}$/

/** Istanbul time as the sheet keeps it: "YYYY-MM-DD HH:mm". */
export const istanbulStamp = (now: Date) => STAMP.format(now)

export const confirmUrl = (token: string, locale: Locale) => `${site.url}${locale === 'en' ? '/en' : ''}/uye-ol/onay?t=${token}`

/** true in every case the form should call a success, so it never tells whether an address is a member; false only
 *  when the sheet or the mail failed. */
export async function requestMembership(application: Application, locale: Locale, now = new Date()): Promise<boolean> {
  const token = randomBytes(32).toString('base64url')
  const result = await applyToSheet({ ...application, token, at: istanbulStamp(now), locale })
  if (result === 'error') return false
  if (result === 'recent') return true // a link went out less than a day ago: no second mail, so the form cannot flood an inbox
  const mail =
    result === 'member' ? renderAlreadyMemberMail({ locale }) : renderMembershipConfirmMail({ locale, confirmUrl: confirmUrl(token, locale) })
  return sendMail({ to: application.email, replyTo: site.contactEmail, ...mail })
}

/** The confirm link: true when the address is now, or already was, a member. */
export async function confirmMembership(token: string, now = new Date()): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  return (await confirmInSheet(token, istanbulStamp(now))) === 'ok'
}
