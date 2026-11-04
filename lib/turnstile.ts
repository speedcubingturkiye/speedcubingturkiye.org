// lib/turnstile.ts: a form's robot check (2026-11-04, Cloudflare Turnstile). The widget in the page (components/
// Turnstile.tsx) answers with a token in the form; this asks Cloudflare whether the token is real, was made for this
// site and for this form. A token answers once and dies after 300 s: there is no store on our side.
import { site } from '@/site.config'

const VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5_000

type Answer = { success?: unknown; hostname?: unknown; action?: unknown }

/**
 * Whether the form answered the robot check. Without the secret (Preview, a machine with no keys) every form stays
 * closed, as the mail ones do; the token and the secret never reach a log. In development Cloudflare's test keys
 * answer without a hostname, so the hostname is only held to the site's in production.
 */
export async function turnstileOk(formData: FormData, ip: string | null, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  const token = String(formData.get('cf-turnstile-response') ?? '')
  if (!secret || !token) return false
  try {
    const res = await fetch(VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) return false
    const answer = (await res.json()) as Answer
    if (answer.success !== true) return false
    if (process.env.NODE_ENV === 'production' && answer.hostname !== new URL(site.url).hostname) return false
    return answer.action === action
  } catch {
    return false // Cloudflare slow or unreachable: the form stays closed
  }
}
