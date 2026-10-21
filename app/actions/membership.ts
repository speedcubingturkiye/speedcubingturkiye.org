'use server'

import { headers } from 'next/headers'
import { botCheck } from '@/lib/form-guard'
import { requestMembership, requestWcaMembership } from '@/lib/membership'
import { ABROAD, ageOn, parseApplication } from '@/lib/membership-rules'
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
 *  a WCA ID, a province and, under 18, the guardian's box too. */
export async function signUpWithWca(_prev: MembershipState, formData: FormData): Promise<MembershipState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true }
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  if (!sheetReady()) return { ok: false, error: 'closed' }

  const wca = readToken('kaydol', String(formData.get('w') ?? ''))
  if (!wca) return { ok: false, error: 'wca_expired' }
  const today = todayIstanbul()
  const parsed = parseApplication(formData, today)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const ranking = Boolean(wca.wcaId) && formData.get('ranking') === 'on'
  if (ranking && parsed.data.city === ABROAD) return { ok: false, error: 'not_allowed' }
  if (ranking && ageOn(parsed.data.birthDate, today) < 18 && formData.get('rankingGuardian') !== 'on') return { ok: false, error: 'guardian' }

  // The address the WCA verified, kept as it came, needs no confirm link
  const confirmed = wca.email !== '' && wca.email.toLowerCase() === parsed.data.email
  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  const result = await requestWcaMembership(parsed.data, { wcaId: wca.wcaId ?? null, ranking, confirmed, ip: clientIp(await headers()) }, locale)
  if (result === 'error') return { ok: false, error: 'send_failed' }
  if (result === 'taken') return { ok: false, error: 'wca_taken' }
  return result === 'sent' ? { ok: true } : { ok: true, kind: result, ranking }
}
