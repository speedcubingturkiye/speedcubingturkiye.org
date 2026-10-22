// lib/email.ts: one mailbox, one address (2026-10-22). The members sheet's script compares addresses by the same rule
// (scripts/uyelik-apps-script.gs, canon), so a row written before it still matches.
import { EMAIL_RE } from '@/app/actions/types'

/**
 * Lower case, no "+tag", and for Gmail no dots and gmail.com for googlemail.com: kutay.temel@gmail.com,
 * KutayTemel+x@googlemail.com and kutaytemel@gmail.com are one mailbox, so one membership and one subscription, and one
 * 10-minute mail limit. Outside Gmail the dots count (ali.veli@outlook.com is not aliveli@outlook.com); a "+tag" goes
 * everywhere, and the double opt-in covers the rare server where "a+b" is a mailbox of its own.
 */
export function canonicalEmail(email: string): string {
  const s = email.trim().toLowerCase()
  const at = s.lastIndexOf('@')
  if (at < 1) return s
  const domain = s.slice(at + 1) === 'googlemail.com' ? 'gmail.com' : s.slice(at + 1)
  const local = s.slice(0, at).split('+')[0]
  return `${domain === 'gmail.com' ? local.replace(/\./g, '') : local}@${domain}`
}

/** A typed address as the forms keep it, or null when it is none: checked (EMAIL_RE, at most 254 characters), then in
 *  its one form, checked again (a Gmail name of dots alone leaves nothing). */
export function readEmail(raw: string): string | null {
  const typed = raw.trim().toLowerCase()
  if (!EMAIL_RE.test(typed) || typed.length > 254) return null
  const email = canonicalEmail(typed)
  return EMAIL_RE.test(email) ? email : null
}
