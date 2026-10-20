// lib/membership.ts: Üye ol (spec 2026-10-19 §3). An application goes to the sheet as "Onay bekliyor" and the applicant
// gets the confirm link; the link makes the row "Üye". The rules live in lib/membership-rules.ts, the sheet calls in
// lib/membership-sheet.ts, the mail bodies in lib/mail-render.ts.
import { randomBytes } from 'node:crypto'
import type { Locale } from '@/i18n/routing'
import { renderMembershipConfirmMail } from '@/lib/mail-render'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { prepareSubscription, requestSubscription } from '@/lib/newsletter'
import { sendMail } from '@/lib/ses'
import { WCA_BASE, WCA_UA } from '@/lib/wca/client'
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
  const { newsletter, ...fields } = application
  const token = randomBytes(32).toString('base64url')
  const result = await applyToSheet({ ...fields, token, at: istanbulStamp(now), locale })
  if (result === 'error') return false
  // No mail to a member, nor a second link within a day, so the form cannot flood an inbox; the form's message
  // ("Üye değilsen…") covers both without telling whether the address is a member. The newsletter box then takes the
  // newsletter form's own path: its mail, its 24 hours.
  if (result === 'member' || result === 'recent') {
    if (newsletter) await requestSubscription(fields.email, locale, now.getTime())
    return true
  }
  // With the box, the membership link confirms the subscription too (spec 2026-10-20 §A)
  const newsletterToken = newsletter ? await prepareSubscription(fields.email, locale, now.getTime()) : null
  const url = newsletterToken ? `${confirmUrl(token, locale)}&b=${newsletterToken}` : confirmUrl(token, locale)
  return sendMail({ to: fields.email, replyTo: site.contactEmail, ...renderMembershipConfirmMail({ locale, confirmUrl: url }) })
}

/** false only when the WCA answers that the ID does not exist (a typo or a made-up ID); an outage or a slow answer
 *  lets the application through. */
export async function wcaIdExists(wcaId: string): Promise<boolean> {
  try {
    const res = await fetch(`${WCA_BASE}/api/v0/persons/${wcaId}`, {
      headers: { 'User-Agent': WCA_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    })
    if (res.status === 404) return false
    if (!res.ok) console.error(`WCA person check: HTTP ${res.status}`)
  } catch (e) {
    console.error('WCA person check failed:', e instanceof Error ? e.name : String(e))
  }
  return true
}

/** The confirm link: true when the address is now, or already was, a member. */
export async function confirmMembership(token: string, now = new Date()): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  return (await confirmInSheet(token, istanbulStamp(now))) === 'ok'
}
