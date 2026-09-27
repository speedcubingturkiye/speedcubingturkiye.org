'use server'

import { botCheck } from '@/lib/form-guard'
import { requestSubscription } from '@/lib/newsletter'
import { EMAIL_RE, type ActionState } from '@/app/actions/types'

export async function subscribe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }

  const email = String(formData.get('email') ?? '').trim()
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: 'invalid' }

  // KVKK explicit consent is required server-side, not only via the checkbox's `required`.
  if (formData.get('consent') !== 'on') return { ok: false, error: 'consent' }

  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  const ok = await requestSubscription(email, locale)
  return ok ? { ok: true } : { ok: false, error: 'send_failed' }
}
