// lib/account.ts: Hesabım (spec 2026-10-21, Parça 1). A member opens it from a one-hour mail link, edits their details,
// moves the membership to a new address through a link sent there, and leaves. The sheet calls live in
// lib/membership-sheet.ts, the mail bodies in lib/mail-render.ts, the links in lib/newsletter-token.ts.
import type { Locale } from '@/i18n/routing'
import { renderAccountLinkMail, renderEmailChangedMail, renderEmailChangeMail } from '@/lib/mail-render'
import { istanbulStamp } from '@/lib/membership'
import { ageOn } from '@/lib/membership-rules'
import { changeMemberEmail, deleteMember, emailChangeGate, getMember, linkFromSheet, setMemberRanking } from '@/lib/membership-sheet'
import { moveSubscription } from '@/lib/newsletter'
import { makeToken, readToken, type TokenData } from '@/lib/newsletter-token'
import { removeSubscriber, sendMail } from '@/lib/ses'
import { todayIstanbul } from '@/lib/wca/status'
import { site } from '@/site.config'

const prefix = (locale: Locale) => (locale === 'en' ? '/en' : '')
export const accountUrl = (token: string, locale: Locale) => `${site.url}${prefix(locale)}/hesabim?t=${token}`
export const emailChangeUrl = (token: string, locale: Locale) => `${site.url}${prefix(locale)}/hesabim/eposta?t=${token}`

/** The link request: true in every case the form should call a success, so it never tells whether the address is a
 *  member; false only when the sheet or the mail failed. */
export async function requestAccountLink(email: string, locale: Locale, now = Date.now()): Promise<boolean> {
  const result = await linkFromSheet(email)
  if (result === 'error') return false
  if (result === 'none') return true
  const url = accountUrl(makeToken('hesap', { email, locale }, now), locale)
  return sendMail({ to: email, replyTo: site.contactEmail, ...renderAccountLinkMail({ locale, url }) })
}

/** The page's link: the member's address and language, or null for an expired or foreign link. */
export const readAccountToken = (token: string, now = Date.now()): TokenData | null => readToken('hesap', token, now)

/** Mails the new address the link that makes it the membership's address: at most once in 10 minutes per new mailbox
 *  (the script's emailGate, 2026-10-22), so a member cannot flood someone else's inbox with it. */
export async function requestEmailChange(
  email: string,
  newEmail: string,
  locale: Locale,
  now = Date.now(),
): Promise<'sent' | 'wait' | 'none' | 'error'> {
  const gate = await emailChangeGate(email, newEmail)
  if (gate !== 'ok') return gate
  const url = emailChangeUrl(makeToken('eposta', { email, newEmail, locale }, now), locale)
  return (await sendMail({ to: newEmail, replyTo: site.contactEmail, ...renderEmailChangeMail({ locale, url }) })) ? 'sent' : 'error'
}

/** The new address's link (`ip`: who opened it). On 'ok' a confirmed newsletter subscription follows to the new address,
 *  this link being its double opt-in, and the old address gets a notice; neither ever changes the answer. */
export async function confirmEmailChange(token: string, ip: string | null, now = Date.now()): Promise<'ok' | 'taken' | 'invalid' | 'error'> {
  const data = readToken('eposta', token, now)
  if (!data?.newEmail) return 'invalid'
  const result = await changeMemberEmail(data.email, data.newEmail)
  if (result === 'none') return 'invalid' // left, or changed already
  if (result !== 'ok') return result
  try {
    const record = { sentAt: new Date(data.issuedAt ?? now).toISOString(), confirmedAt: new Date(now).toISOString(), ip }
    await moveSubscription(data.email, data.newEmail, record)
  } catch (e) {
    console.error('newsletter move on address change failed:', e instanceof Error ? e.name : String(e))
  }
  await sendMail({ to: data.email, replyTo: site.contactEmail, ...renderEmailChangedMail({ locale: data.locale }) })
  return 'ok'
}

/** Üyelikten ayrılma: the row goes; the newsletter contact too when asked, and only once the row is gone. */
export async function leaveMembership(email: string, alsoNewsletter: boolean): Promise<'ok' | 'none' | 'error'> {
  const result = await deleteMember(email)
  if (result === 'ok' && alsoNewsletter) {
    try {
      await removeSubscriber(email)
    } catch (e) {
      console.error('newsletter removal on leaving failed:', e instanceof Error ? e.name : String(e))
    }
  }
  return result
}

/** İl sıralaması in (spec 2026-10-21, Parça 2). Someone under 18 ticks the guardian box too; the script checks the
 *  verified WCA ID (abroad joins too since 2026-10-22). */
export async function joinRanking(email: string, guardian: boolean, now = new Date()): Promise<'ok' | 'none' | 'guardian' | 'not_allowed' | 'error'> {
  const member = await getMember(email)
  if (member === null) return 'none'
  if (member === 'error') return 'error'
  if (ageOn(member.birthDate, todayIstanbul(now)) < 18 && !guardian) return 'guardian'
  return setMemberRanking(email, true, istanbulStamp(now))
}
