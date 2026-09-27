// lib/form-guard.ts
/** Honeypot + time-trap check shared by every server-action form (contact: Task 14, newsletter: Task 15). */
export function botCheck(formData: FormData, now = Date.now()): 'bot' | 'too_fast' | null {
  if (formData.get('website')) return 'bot' // honeypot: bots fill it, humans never see it
  const ts = formData.get('ts')
  if (!ts) return null // missing/empty ts: no JS ran, nothing to compare against
  return now - Number(ts) < 3000 ? 'too_fast' : null
}
