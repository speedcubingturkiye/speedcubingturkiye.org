// lib/newsletter-token.ts: confirm and unsubscribe links (spec §8). AES-256-GCM: the address never appears in a URL,
// a server log or the browser history, and a token only opens the door it was made for.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { Locale } from '@/i18n/routing'

export type TokenPurpose = 'onay' | 'cikis'
export type TokenData = { email: string; locale: Locale }

/** A confirm link lives as long as an unconfirmed address stays on the list (spec §5). */
export const CONFIRM_TTL_MS = 7 * 86_400_000

// The key for development and tests when NEWSLETTER_SECRET is unset. Production has no fallback: makeToken and
// readToken both throw from key() unless the secret is at least 32 characters.
const DEV_SECRET = 'development-only-newsletter-secret-0000'

function key(): Buffer {
  const secret = process.env.NEWSLETTER_SECRET || (process.env.NODE_ENV === 'production' ? '' : DEV_SECRET)
  // Named, because every log line prints e.name.
  if (secret.length < 32) throw Object.assign(new Error('NEWSLETTER_SECRET missing or shorter than 32 characters'), { name: 'NewsletterSecretMissing' })
  return createHash('sha256').update(secret).digest()
}

export function makeToken(purpose: TokenPurpose, data: TokenData, now = Date.now()): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const plain = JSON.stringify({ p: purpose, e: data.email, l: data.locale, t: Math.floor(now / 1000) })
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64url')
}

/**
 * The token's data, or null for anything else: another purpose, another secret, a changed byte, an old confirm link.
 * Throws, like makeToken, when the secret is missing or too short: a misconfiguration is not an invalid link.
 */
export function readToken(purpose: TokenPurpose, token: string, now = Date.now()): TokenData | null {
  const k = key() // outside the try on purpose, so the catch below cannot turn a misconfiguration into null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 12 + 16 + 2) return null
    const decipher = createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(raw.length - 16))
    const plain = Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString('utf8')
    const v = JSON.parse(plain) as { p?: unknown; e?: unknown; l?: unknown; t?: unknown }
    if (v.p !== purpose || typeof v.e !== 'string' || (v.l !== 'tr' && v.l !== 'en') || typeof v.t !== 'number') return null
    if (purpose === 'onay' && now - v.t * 1000 > CONFIRM_TTL_MS) return null
    return { email: v.e, locale: v.l }
  } catch {
    return null
  }
}
