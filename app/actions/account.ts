'use server'

import { EMAIL_RE, type AccountState } from '@/app/actions/types'
import { joinRanking, leaveMembership, readAccountToken, requestAccountLink, requestEmailChange } from '@/lib/account'
import { botCheck } from '@/lib/form-guard'
import { istanbulStamp, wcaIdExists } from '@/lib/membership'
import { parseApplication } from '@/lib/membership-rules'
import { setMemberRanking, sheetReady, unlinkMemberWca, updateMember } from '@/lib/membership-sheet'
import { requestSubscription } from '@/lib/newsletter'
import { removeSubscriber } from '@/lib/ses'
import { todayIstanbul } from '@/lib/wca/status'

// Hesabım's forms (spec 2026-10-21). Each one but the link request carries the page's one-hour token in `t`; a token
// that ran out answers 'expired', and the page offers a new link.
const tokenOf = (formData: FormData) => readAccountToken(String(formData.get('t') ?? ''))
const addressOf = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim().toLowerCase()
const isAddress = (email: string) => EMAIL_RE.test(email) && email.length <= 254

/** The link request: the same answer for members and strangers alike. */
export async function requestLink(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  if (!sheetReady()) return { ok: false, error: 'closed' }
  const email = addressOf(formData, 'email')
  if (!isAddress(email)) return { ok: false, error: 'invalid' }
  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  return (await requestAccountLink(email, locale)) ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** Bilgilerim: the Üye ol form's rules, the address taken from the token. */
export async function saveAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  formData.set('email', data.email)
  const parsed = parseApplication(formData, todayIstanbul())
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const { firstName, lastName, birthDate, guardian, city, wcaId, helps } = parsed.data
  if (wcaId && !(await wcaIdExists(wcaId))) return { ok: false, error: 'wcaId' }
  const result = await updateMember(data.email, { firstName, lastName, birthDate, guardian, city, wcaId, helps }, istanbulStamp(new Date()))
  if (result === 'none') return { ok: false, error: 'expired' }
  if (result === 'locked') return { ok: false, error: 'city_locked' }
  return result === 'ok' ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** WCA hesabı (spec 2026-10-21, Parça 2): the link goes, the il ranking with it. Linking runs through /api/wca. */
export async function unlinkWca(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  const result = await unlinkMemberWca(data.email)
  if (result === 'none') return { ok: false, error: 'expired' }
  return result === 'ok' ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** İl sıralaması: in with the explicit consent box (and the guardian box under 18), out at once. */
export async function ranking(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  const result =
    formData.get('op') === 'leave'
      ? await setMemberRanking(data.email, false, istanbulStamp(new Date()))
      : formData.get('consent') !== 'on'
        ? 'consent'
        : await joinRanking(data.email, formData.get('guardian') === 'on')
  if (result === 'ok') return { ok: true }
  if (result === 'none') return { ok: false, error: 'expired' }
  if (result === 'error') return { ok: false, error: 'send_failed' }
  return { ok: false, error: result } // consent, guardian, not_allowed
}

/** E-posta adresi: a confirm link to the new address; the change happens when it is clicked. */
export async function changeEmail(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  const newEmail = addressOf(formData, 'newEmail')
  if (!isAddress(newEmail)) return { ok: false, error: 'invalid' }
  if (newEmail === data.email.toLowerCase()) return { ok: false, error: 'same_email' }
  return (await requestEmailChange(data.email, newEmail, data.locale)) ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** Bülten: a sign-up takes the newsletter form's own double opt-in; leaving is at once. */
export async function newsletter(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  if (formData.get('op') === 'unsubscribe') {
    try {
      await removeSubscriber(data.email)
      return { ok: true }
    } catch (e) {
      console.error('newsletter removal from Hesabım failed:', e instanceof Error ? e.name : String(e))
      return { ok: false, error: 'send_failed' }
    }
  }
  // The newsletter form's explicit consent, ticked here as there
  if (formData.get('consent') !== 'on') return { ok: false, error: 'consent' }
  return (await requestSubscription(data.email, data.locale)) ? { ok: true } : { ok: false, error: 'send_failed' }
}

/** Üyelikten ayrıl: only with the box ticked. */
export async function leave(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const data = tokenOf(formData)
  if (!data) return { ok: false, error: 'expired' }
  if (formData.get('confirm') !== 'on') return { ok: false, error: 'confirm' }
  const result = await leaveMembership(data.email, formData.get('newsletter') === 'on')
  if (result === 'none') return { ok: false, error: 'expired' }
  return result === 'ok' ? { ok: true } : { ok: false, error: 'send_failed' }
}
