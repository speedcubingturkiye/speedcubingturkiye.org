export type ContactSubject = 'genel' | 'yarisma' | 'gonullu' | 'medya' | 'guvenlik' | 'kvkk'
export type ActionState = { ok: boolean; error?: 'invalid' | 'too_fast' | 'consent' | 'send_failed' }

export const CONTACT_SUBJECTS: ContactSubject[] = ['genel', 'yarisma', 'gonullu', 'medya', 'guvenlik', 'kvkk']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
