export type ContactSubject = 'genel' | 'yarisma' | 'gonullu' | 'medya' | 'guvenlik' | 'kvkk' | 'diger'
export type ActionState = { ok: boolean; error?: 'invalid' | 'too_fast' | 'consent' | 'send_failed' }
export type MembershipState = { ok: boolean; error?: 'invalid' | 'too_fast' | 'guardian' | 'wcaId' | 'closed' | 'send_failed' }
/** Hesabım's forms (spec 2026-10-21); 'expired': the page's one-hour link ran out, or the membership is gone */
export type AccountState = {
  ok: boolean
  error?: 'invalid' | 'too_fast' | 'guardian' | 'wcaId' | 'expired' | 'same_email' | 'confirm' | 'consent' | 'closed' | 'send_failed'
}

export const CONTACT_SUBJECTS: ContactSubject[] = ['genel', 'yarisma', 'gonullu', 'medya', 'guvenlik', 'kvkk', 'diger']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
