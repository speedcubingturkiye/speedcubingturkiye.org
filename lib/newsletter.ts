// lib/newsletter.ts: the newsletter's rules (spec §5, §6): who gets a confirmation mail, who counts as a subscriber,
// who gets each mailing and in which language. SES calls live in lib/ses.ts, mail bodies in lib/mail-render.ts.
import type { Locale } from '@/i18n/routing'
import { renderConfirmMail, unsubscribeHeaders, type RenderedMail } from '@/lib/mail-render'
import { CONFIRM_TTL_MS, makeToken, readToken } from '@/lib/newsletter-token'
import { confirmSubscriber, getSubscriber, listStalePending, listSubscribers, putPending, removeSubscriber, sendMail } from '@/lib/ses'
import { site } from '@/site.config'

/** No second confirmation mail to the same address within a day: the form cannot be used to flood an inbox. */
export const RESEND_AFTER_MS = 24 * 3_600_000

const prefix = (locale: Locale) => (locale === 'en' ? '/en' : '')
const errorName = (e: unknown) => (e instanceof Error ? e.name : String(e))

export const confirmUrl = (token: string, locale: Locale) => `${site.url}${prefix(locale)}/bulten/onay?t=${token}`
export const unsubscribePageUrl = (token: string, locale: Locale) => `${site.url}${prefix(locale)}/bulten/cikis?t=${token}`
export const oneClickUrl = (token: string) => `${site.url}/api/bulten/cikis?t=${token}`

/** k***@gmail.com: enough for the owner to recognise the address, not enough to read it off a screen. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  return at < 1 ? '***' : `${email[0]}***${email.slice(at)}`
}

/** Form sign-up (spec §6.2). true in every case the form should call a success, so it never tells whether an address
 *  is on the list; false only when SES or the mail failed. */
export async function requestSubscription(email: string, locale: Locale, now = Date.now()): Promise<boolean> {
  try {
    const current = await getSubscriber(email)
    if (current?.status === 'confirmed') return true
    if (current && now - current.updatedAt < RESEND_AFTER_MS) return true
    const token = makeToken('onay', { email, locale }, now)
    // Claim first: a parallel sign-up for a new address fails on CreateContact before it can mail.
    await putPending(email, locale, current !== null, now)
    if (await sendMail({ to: email, ...renderConfirmMail({ locale, confirmUrl: confirmUrl(token, locale) }) })) return true
    await removeSubscriber(email) // a refused mail releases the claim: no 24-hour lockout
    return false
  } catch (e) {
    // A parallel sign-up for the same new address claimed it and mails the link: success, no second mail.
    if (errorName(e) === 'AlreadyExistsException') return true
    console.error('newsletter sign-up failed:', errorName(e))
    return false
  }
}

/** The confirm link (spec §6.3): true when the address is now a confirmed subscriber. */
export async function confirmSubscription(token: string, ip: string | null, now = Date.now()): Promise<boolean> {
  const data = readToken('onay', token, now)
  if (!data) return false
  try {
    const current = await getSubscriber(data.email)
    if (!current) return false // deleted after 7 days, or unsubscribed since
    if (current.status === 'confirmed') return true
    // sentAt: the pending write (current.updatedAt) happens right before the confirmation mail, so it is the request time
    // the KVKK notice promises; UpdateContact replaces the attributes, so it has to be written again here.
    await confirmSubscriber(data.email, data.locale, { sentAt: new Date(current.updatedAt).toISOString(), confirmedAt: new Date(now).toISOString(), ip })
    return true
  } catch (e) {
    console.error('newsletter confirm failed:', errorName(e))
    return false
  }
}

/** Unsubscribe (spec §6.4): deletes the contact. false for anything but an unsubscribe token, or when SES failed. */
export async function cancelSubscription(token: string): Promise<boolean> {
  const data = readToken('cikis', token)
  if (!data) return false
  try {
    await removeSubscriber(data.email)
    return true
  } catch (e) {
    console.error('newsletter unsubscribe failed:', errorName(e))
    return false
  }
}

export type Links = { page: string; oneClick: string }
export type SendReport = { sent: { tr: number; en: number }; failed: number }

// ponytail: each mail is followed by a 100 ms pause, so a route's 300 s holds 850 to 2,500 mails depending on SES latency;
// beyond about 800 subscribers, split the run (a queue or several invocations) and raise the SES sending rate.
const GAP_MS = 100

/** A copy of the Turkish mail to info@, then one mailing to every confirmed subscriber in their language (spec §6.5,
 *  §6.6). Failures are counted, never retried: a second run must not mail anyone twice. A listing error throws. */
export async function mailSubscribers(
  render: (locale: Locale, links: Links) => RenderedMail,
  pause: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<SendReport> {
  // next dev may hold the real SES keys (.env.local): a development server never mails the production list.
  if (process.env.NODE_ENV === 'development') {
    console.log('[newsletter:dev] mailing skipped')
    return { sent: { tr: 0, en: 0 }, failed: 0 }
  }
  // The team's copy goes first, without list headers: a mailing that stops partway (a listing error, the 300 s cut) must
  // still have told info@ that it started.
  const copy = await sendMail({ to: site.contactEmail, ...render('tr', { page: `${site.url}/bulten/cikis`, oneClick: `${site.url}/api/bulten/cikis` }) })
  if (!copy) console.error('newsletter copy to info@ refused')
  await pause(GAP_MS) // the copy counts toward the 10 mails per second like any other
  const report: SendReport = { sent: { tr: 0, en: 0 }, failed: 0 }
  for (const locale of ['tr', 'en'] as const) {
    for await (const email of listSubscribers(locale)) {
      const token = makeToken('cikis', { email, locale })
      const links = { page: unsubscribePageUrl(token, locale), oneClick: oneClickUrl(token) }
      const ok = await sendMail({ to: email, replyTo: site.contactEmail, headers: unsubscribeHeaders(links.oneClick), ...render(locale, links) })
      if (ok) report.sent[locale]++
      else report.failed++
      await pause(GAP_MS)
    }
  }
  return report
}

/** Deletes unconfirmed addresses older than 7 days (spec §5); the daily cron calls it. Returns how many went. */
export async function cleanupPending(now = Date.now()): Promise<number> {
  let removed = 0
  for await (const email of listStalePending(now - CONFIRM_TTL_MS)) {
    await removeSubscriber(email)
    removed++
  }
  return removed
}
