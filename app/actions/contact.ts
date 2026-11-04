'use server'

import { contactRecipient, contactSubjectLine } from '@/lib/contact-subject'
import { botCheck } from '@/lib/form-guard'
import { requestIp } from '@/lib/ip'
import { sendMail } from '@/lib/ses'
import { turnstileOk } from '@/lib/turnstile'
import { CONTACT_SUBJECTS, EMAIL_RE, type ActionState, type ContactSubject } from '@/app/actions/types'

export async function sendContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  // A form posted without running the page answers no robot check (lib/turnstile.ts): the spam that reached info@
  // (2026-10-27). A no-JS visitor finds the address in the form instead (components/Turnstile.tsx, 2026-11-04)
  if (!(await turnstileOk(formData, await requestIp(), 'contact'))) return { ok: false, error: 'captcha' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const subject = String(formData.get('subject') ?? '') as ContactSubject
  const title = String(formData.get('title') ?? '') // only "Diğer" takes one; contactSubjectLine decides
  const message = String(formData.get('message') ?? '').trim()
  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'

  const valid =
    name.length >= 2 && name.length <= 100 && !/[\r\n]/.test(name) &&
    EMAIL_RE.test(email) && email.length <= 254 &&
    CONTACT_SUBJECTS.includes(subject) &&
    message.length >= 10 && message.length <= 5000
  if (!valid) return { ok: false, error: 'invalid' }
  // The "search engine registration" scam writes from a look-alike of our address (search-speedcubingturkiye.org): it is
  // told the message went, and no mail goes
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
  if (domain.includes('speedcubingturkiye') && !/^speedcubingturkiye\.(org|com)$/.test(domain)) return { ok: true }

  const heading = contactSubjectLine(subject, title, locale)
  if (!heading) return { ok: false, error: 'invalid' } // a title with a line break

  // The body's field names are Turkish whatever the form's language; the subject label and the title stay as the writer saw them.
  const text = [
    `Ad: ${name}`,
    `E-posta: ${email}`,
    `Konu: ${heading.label}`,
    ...(heading.title ? [`Başlık: ${heading.title}`] : []),
    `Dil: ${locale}`,
    '',
    message,
  ].join('\n')
  // "<name> (form)" as the sender's name: a reply reads "Re: Speedcubing Türkiye: Genel", not the writer's own name.
  const ok = await sendMail({ to: contactRecipient(subject), replyTo: email, fromName: `${name} (form)`, subject: heading.line, text })
  return ok ? { ok: true } : { ok: false, error: 'send_failed' }
}
