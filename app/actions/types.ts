export type ContactSubject = 'genel' | 'yarisma' | 'gonullu' | 'medya' | 'guvenlik' | 'kvkk' | 'diger'
export type ActionState = { ok: boolean; error?: 'invalid' | 'too_fast' | 'consent' | 'send_failed' }
/** Üye ol's forms. WCA ile kaydol (spec 2026-10-21) adds `kind` (how a WCA sign-up ended: 'started' at once, 'linked' to
 *  the member the address already is, or 'member' with nothing to link) with `ranking` (the il ranking box), and three
 *  errors: the WCA details expired, another member verified this WCA ID, the il ranking with Yurt dışı. */
export type MembershipState = {
  ok: boolean
  kind?: 'started' | 'linked' | 'member'
  ranking?: boolean
  error?: 'invalid' | 'too_fast' | 'guardian' | 'closed' | 'send_failed' | 'wca_expired' | 'wca_taken' | 'not_allowed'
}
/** Hesabım's forms (spec 2026-10-21); 'expired': the page's one-hour link ran out, or the membership is gone;
 *  'city_locked': the il ranking holds the city; 'not_allowed': the il ranking needs a verified WCA ID and a province */
export type AccountState = {
  ok: boolean
  error?:
    | 'invalid'
    | 'too_fast'
    | 'guardian'
    | 'expired'
    | 'same_email'
    | 'confirm'
    | 'consent'
    | 'closed'
    | 'send_failed'
    | 'city_locked'
    | 'not_allowed'
}

export const CONTACT_SUBJECTS: ContactSubject[] = ['genel', 'yarisma', 'gonullu', 'medya', 'guvenlik', 'kvkk', 'diger']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
