'use server'

import { readEmail } from '@/lib/email'
import { botCheck } from '@/lib/form-guard'
import { requestIp } from '@/lib/ip'
import { requestSubscription } from '@/lib/newsletter'
import { turnstileOk } from '@/lib/turnstile'
import type { ActionState } from '@/app/actions/types'

export async function subscribe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  // A posted address without the page behind it: the same robot check as the contact form (2026-11-04)
  if (!(await turnstileOk(formData, await requestIp(), 'newsletter'))) return { ok: false, error: 'captcha' }

  // One form per mailbox (2026-10-22): Ali@x.com, ali+news@x.com and ali@x.com are one subscription
  const email = readEmail(String(formData.get('email') ?? ''))
  if (!email) return { ok: false, error: 'invalid' }

  // KVKK explicit consent is required server-side, not only via the checkbox's `required`.
  if (formData.get('consent') !== 'on') return { ok: false, error: 'consent' }

  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  const ok = await requestSubscription(email, locale)
  return ok ? { ok: true } : { ok: false, error: 'send_failed' }
}
