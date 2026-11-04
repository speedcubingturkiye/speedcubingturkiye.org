// lib/form-guard.ts
/**
 * Honeypot + time-trap check shared by every server-action form (contact: Task 14, newsletter: Task 15).
 * A missing `ts` still passes: the stamp is the client's word anyway, so a bot can forge it, and a form sent without
 * JS has none. 2026-11-03: a stamp that is there but is not a number, or comes from the future, is not a browser: it
 * is told the form went (as a filled honeypot is). The robot check (lib/turnstile.ts) is the real cover: a form posted
 * without running the page cannot answer it, whatever stamp it carries.
 */
export function botCheck(formData: FormData, now = Date.now()): 'bot' | 'too_fast' | null {
  if (formData.get('website')) return 'bot' // honeypot: bots fill it, humans never see it
  const raw = formData.get('ts')
  if (raw === null || raw === '') return null // missing/empty ts: no JS ran, nothing to compare against
  const ts = Number(raw)
  if (!Number.isFinite(ts) || ts > now) return 'bot' // "abc", or a stamp from the future: not a browser
  return now - ts < 3000 ? 'too_fast' : null
}
