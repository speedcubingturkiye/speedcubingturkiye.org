export type ContactSubject = 'genel' | 'yarisma' | 'gonullu' | 'medya' | 'guvenlik' | 'kvkk' | 'diger'
export type ActionState = { ok: boolean; error?: 'invalid' | 'too_fast' | 'consent' | 'send_failed' }

export const CONTACT_SUBJECTS: ContactSubject[] = ['genel', 'yarisma', 'gonullu', 'medya', 'guvenlik', 'kvkk', 'diger']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
