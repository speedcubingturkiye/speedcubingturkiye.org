'use server'

import { botCheck } from '@/lib/form-guard'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'
import { CONTACT_SUBJECTS, EMAIL_RE, type ActionState, type ContactSubject } from '@/app/actions/types'

export async function sendContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const subject = String(formData.get('subject') ?? '') as ContactSubject
  const message = String(formData.get('message') ?? '').trim()
  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'

  const valid =
    name.length >= 2 && name.length <= 100 && !/[\r\n]/.test(name) &&
    EMAIL_RE.test(email) && email.length <= 254 &&
    CONTACT_SUBJECTS.includes(subject) &&
    message.length >= 10 && message.length <= 5000
  if (!valid) return { ok: false, error: 'invalid' }

  const text = `Ad: ${name}\nE-posta: ${email}\nKonu: ${subject}\nDil: ${locale}\n\n${message}`
  const ok = await sendMail({ to: site.contactEmail, replyTo: email, subject: `[${subject}] ${name}`, text })
  return ok ? { ok: true } : { ok: false, error: 'send_failed' }
}
