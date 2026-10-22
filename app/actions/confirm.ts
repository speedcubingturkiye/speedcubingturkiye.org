'use server'

// app/actions/confirm.ts: the buttons of the three confirm pages (2026-10-22). A mailed link opens its page; only this
// POST confirms, so a mail scanner that opens a link (Safe Links, Proofpoint) confirms nothing.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { confirmEmailChange } from '@/lib/account'
import { confirmMembership } from '@/lib/membership'
import { clientIp, confirmSubscription } from '@/lib/newsletter'

const prefix = (formData: FormData) => (formData.get('locale') === 'en' ? '/en' : '')
const field = (formData: FormData, key: string) => String(formData.get(key) ?? '')

/** Üyelik: the membership and, with the newsletter box (`b`), the subscription in the same press, the newsletter form's
 *  double opt-in record with it; a failure there never changes where the visitor lands. */
export async function confirmMembershipLink(formData: FormData): Promise<void> {
  const result = await confirmMembership(field(formData, 't'))
  const began = result === 'ok' || result === 'wca_taken'
  const newsletterToken = field(formData, 'b')
  if (began && newsletterToken) await confirmSubscription(newsletterToken, clientIp(await headers())).catch(() => false)
  redirect(`${prefix(formData)}/uye-ol?durum=${result === 'ok' ? 'onaylandi' : result === 'wca_taken' ? 'onaylandi-wca' : 'gecersiz'}`)
}

/** Bülten: the double opt-in. */
export async function confirmNewsletterLink(formData: FormData): Promise<void> {
  const ok = await confirmSubscription(field(formData, 't'), clientIp(await headers()))
  redirect(`${prefix(formData)}/bulten/${ok ? 'tesekkurler' : 'gecersiz'}`)
}

const DURUM = { ok: 'eposta-degisti', taken: 'eposta-kullanimda', invalid: 'gecersiz', error: 'hata' } as const

/** E-posta değiştirme: the new address's button. The IP joins the double opt-in record of the newsletter that follows. */
export async function confirmEmailChangeLink(formData: FormData): Promise<void> {
  const result = await confirmEmailChange(field(formData, 't'), clientIp(await headers()))
  redirect(`${prefix(formData)}/hesabim?durum=${DURUM[result]}`)
}
