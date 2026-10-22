'use server'

import { headers } from 'next/headers'
import { canonicalEmail } from '@/lib/email'
import { botCheck } from '@/lib/form-guard'
import { requestMembership, requestWcaMembership } from '@/lib/membership'
import { ageOn, parseApplication } from '@/lib/membership-rules'
import { sheetReady } from '@/lib/membership-sheet'
import { clientIp } from '@/lib/newsletter'
import { readToken } from '@/lib/newsletter-token'
import { todayIstanbul } from '@/lib/wca/status'
import type { MembershipState } from '@/app/actions/types'

export async function applyForMembership(_prev: MembershipState, formData: FormData): Promise<MembershipState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  if (!sheetReady()) return { ok: false, error: 'closed' }

  const parsed = parseApplication(formData, todayIstanbul())
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  return (await requestMembership(parsed.data, locale)) ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** WCA ile kaydol (spec 2026-10-21): the form the WCA login filled. `w` is its 30-minute token; the il ranking box needs
 *  a WCA ID (abroad too since 2026-10-22) and, under 18, the guardian's box too. */
export async function signUpWithWca(_prev: MembershipState, formData: FormData): Promise<MembershipState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true }
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  if (!sheetReady()) return { ok: false, error: 'closed' }

  const wca = readToken('kaydol', String(formData.get('w') ?? ''))
  if (!wca) return { ok: false, error: 'wca_expired' }
  // The date of birth the WCA gave, whatever the form sends, so no one under 18 skips the guardian's box (2026-10-22)
  if (wca.dob) formData.set('birthDate', wca.dob)
  const today = todayIstanbul()
  const parsed = parseApplication(formData, today)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const ranking = Boolean(wca.wcaId) && formData.get('ranking') === 'on'
  if (ranking && ageOn(parsed.data.birthDate, today) < 18 && formData.get('rankingGuardian') !== 'on') return { ok: false, error: 'guardian' }

  // The address the WCA verified needs no confirm link, in its one form too (2026-10-22: Kutay.Temel@gmail.com is
  // kutaytemel@gmail.com). One with a "+tag" still takes the link: on a rare server "a+b" is a mailbox of its own.
  const confirmed = wca.email !== '' && !wca.email.includes('+') && canonicalEmail(wca.email) === parsed.data.email
  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  const result = await requestWcaMembership(parsed.data, { wcaId: wca.wcaId ?? null, ranking, confirmed, ip: clientIp(await headers()) }, locale)
  if (result === 'error') return { ok: false, error: 'send_failed' }
  if (result === 'taken') return { ok: false, error: 'wca_taken' }
  return result === 'sent' ? { ok: true } : { ok: true, kind: result, ranking }
}
