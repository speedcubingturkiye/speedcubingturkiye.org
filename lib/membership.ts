// lib/membership.ts: Üye ol (spec 2026-10-19 §3). An application goes to the sheet as "Onay bekliyor" and the applicant
// gets the confirm link; the link makes the row "Üye". WCA ile kaydol (spec 2026-10-21) skips the link for the address
// the WCA verified. The rules live in lib/membership-rules.ts, the sheet calls in lib/membership-sheet.ts, the mail
// bodies in lib/mail-render.ts.
import { randomBytes } from 'node:crypto'
import type { Locale } from '@/i18n/routing'
import { renderMembershipConfirmMail, renderMembershipStartedMail } from '@/lib/mail-render'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { prepareSubscription, requestSubscription, subscribeVerified } from '@/lib/newsletter'
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
  const { newsletter, ...fields } = application
  const token = randomBytes(32).toString('base64url')
  // No WCA ID: it comes only from a WCA login (WCA ile kaydol, Hesabım)
  const result = await applyToSheet({ ...fields, wcaId: '', token, at: istanbulStamp(now), locale })
  if (result === 'error') return false
  // No mail to a member, nor a second link within a day, so the form cannot flood an inbox; the form's message
  // ("Üye değilsen…") covers both without telling whether the address is a member. The newsletter box then takes the
  // newsletter form's own path: its mail, its 24 hours.
  if (result === 'member' || result === 'recent') {
    if (newsletter) await requestSubscription(fields.email, locale, now.getTime())
    return true
  }
  return sendConfirm(fields.email, token, newsletter, locale, now)
}

/** The confirm mail. With the newsletter box, its link confirms the subscription too (spec 2026-10-20 §A). */
async function sendConfirm(email: string, token: string, newsletter: boolean, locale: Locale, now: Date): Promise<boolean> {
  const newsletterToken = newsletter ? await prepareSubscription(email, locale, now.getTime()) : null
  const url = newsletterToken ? `${confirmUrl(token, locale)}&b=${newsletterToken}` : confirmUrl(token, locale)
  return sendMail({ to: email, replyTo: site.contactEmail, ...renderMembershipConfirmMail({ locale, confirmUrl: url }) })
}

/** A WCA sign-up: the WCA ID from the WCA login (null for an account that never competed), the il ranking box, whether the
 *  address is the one the WCA verified, and the visitor's IP for the newsletter's record. */
export type WcaSignup = { wcaId: string | null; ranking: boolean; confirmed: boolean; ip: string | null }
export type WcaSignupResult = 'started' | 'linked' | 'member' | 'sent' | 'taken' | 'error'

/**
 * WCA ile kaydol (spec 2026-10-21). The address the WCA verified starts the membership at once: a new row as a member
 * (the started mail goes), or the WCA ID linked to the member the address already is; the newsletter box starts the
 * subscription there and then. Any other address takes the confirm link as a typed application does, the WCA mark and
 * the ranking waiting in the row. 'sent' answers the form as a typed application's success does.
 */
export async function requestWcaMembership(application: Application, wca: WcaSignup, locale: Locale, now = new Date()): Promise<WcaSignupResult> {
  const { newsletter, ...fields } = application
  const token = randomBytes(32).toString('base64url')
  const verified = wca.wcaId !== null
  const result = await applyToSheet({
    ...fields,
    wcaId: wca.wcaId ?? '',
    token,
    at: istanbulStamp(now),
    locale,
    wcaVerified: verified,
    ranking: verified && wca.ranking,
    confirmed: wca.confirmed,
  })
  if (result === 'error' || result === 'taken') return result
  if (wca.confirmed && (result === 'started' || result === 'linked' || result === 'member')) {
    if (newsletter) {
      try {
        await subscribeVerified(fields.email, locale, wca.ip, now.getTime())
      } catch (e) {
        console.error('newsletter on WCA sign-up failed:', e instanceof Error ? e.name : String(e))
      }
    }
    if (result === 'started') await sendMail({ to: fields.email, replyTo: site.contactEmail, ...renderMembershipStartedMail({ locale }) })
    return result
  }
  if (result === 'member' || result === 'recent') {
    if (newsletter) await requestSubscription(fields.email, locale, now.getTime())
    return 'sent'
  }
  return (await sendConfirm(fields.email, token, newsletter, locale, now)) ? 'sent' : 'error'
}

/** The confirm link: true when the address is now, or already was, a member. */
export async function confirmMembership(token: string, now = new Date()): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  return (await confirmInSheet(token, istanbulStamp(now))) === 'ok'
}
