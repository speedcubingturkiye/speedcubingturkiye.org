// lib/contact-subject.ts: the subject line of the contact form's notification mail (docs/yayin-kontrol-listesi.md §7):
// "Speedcubing Türkiye: <label>", where the label is what the form's select shows, in the form's language. "Diğer" may
// carry a title the writer chose, which then replaces the label. Pure, like lib/mail-render.ts: the action and the tests
// read the same message files.
import type { ContactSubject } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'
import { site } from '@/site.config'
import trMessages from '@/messages/tr.json'
import enMessages from '@/messages/en.json'

export const TITLE_MAX = 100

/**
 * The label, the title and the subject line for one form submission; null when the title holds a line break, which
 * must never reach a header. Only "Diğer" takes a title: trimmed, inner whitespace collapsed, capped at TITLE_MAX
 * characters. For every other subject the title is ignored, so the field can be left in a stale form.
 */
export function contactSubjectLine(subject: ContactSubject, rawTitle: string, locale: Locale): { label: string; title: string; line: string } | null {
  const label = (locale === 'en' ? enMessages : trMessages).forms.subjects[subject]
  if (subject !== 'diger') return { label, title: '', line: `${site.name}: ${label}` }
  if (/[\r\n]/.test(rawTitle)) return null
  // Cut by code points: a cut through an emoji would leave half a character behind.
  const title = [...rawTitle.trim().replace(/\s+/g, ' ')].slice(0, TITLE_MAX).join('').trimEnd()
  return { label, title, line: `${site.name}: ${title || label}` }
}
