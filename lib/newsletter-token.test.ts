// lib/newsletter-token.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_TTL_MS, codeOf, CONFIRM_TTL_MS, LINK_TTL_MS, makeToken, readToken, signCode, SIGNUP_TTL_MS } from '@/lib/newsletter-token'

const data = { email: 'kutay@example.com', locale: 'en' as const }

describe('newsletter tokens', () => {
  beforeEach(() => {
    vi.stubEnv('NEWSLETTER_SECRET', 'a'.repeat(32))
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips both purposes as URL-safe text that does not show the address', () => {
    for (const purpose of ['onay', 'cikis'] as const) {
      const token = makeToken(purpose, data)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(token).not.toContain('kutay')
      expect(readToken(purpose, token)).toEqual(data)
    }
  })

  it('Hesabım links last an hour; the address change carries the new address', () => {
    const now = Date.UTC(2026, 9, 21, 12)
    const page = makeToken('hesap', data, now)
    expect(readToken('hesap', page, now + ACCOUNT_TTL_MS - 1000)).toEqual(data)
    expect(readToken('hesap', page, now + ACCOUNT_TTL_MS + 1000)).toBeNull()
    expect(readToken('onay', page, now)).toBeNull()
    const change = makeToken('eposta', { ...data, newEmail: 'yeni@example.com' }, now)
    // issuedAt: when the link was asked for, the double opt-in record of the newsletter that follows the change
    expect(readToken('eposta', change, now)).toEqual({ ...data, newEmail: 'yeni@example.com', issuedAt: now })
    expect(readToken('eposta', change, now + ACCOUNT_TTL_MS + 1000)).toBeNull()
    expect(readToken('eposta', makeToken('eposta', data, now), now)).toBeNull() // no new address: not a change link
  })

  it('a WCA sign-up (kaydol) carries what the WCA gave and lasts 30 minutes', () => {
    const now = Date.UTC(2026, 9, 21, 12)
    const signup = { ...data, wcaId: '2019TEME01', name: 'Kutay Temel', dob: '2005-06-07' }
    const token = makeToken('kaydol', signup, now)
    expect(readToken('kaydol', token, now + SIGNUP_TTL_MS - 1000)).toEqual(signup)
    expect(readToken('kaydol', token, now + SIGNUP_TTL_MS + 1000)).toBeNull()
    expect(readToken('hesap', token, now)).toBeNull()
    // a WCA account without a WCA ID, an email or a date of birth
    expect(readToken('kaydol', makeToken('kaydol', { email: '', locale: 'tr', name: 'Ali Veli' }, now), now)).toEqual({ email: '', locale: 'tr', name: 'Ali Veli', dob: '' })
  })

  it('refuses a token made for the other purpose', () => {
    expect(readToken('cikis', makeToken('onay', data))).toBeNull()
    expect(readToken('onay', makeToken('cikis', data))).toBeNull()
  })

  it('refuses a changed character, garbage and an empty string', () => {
    const token = makeToken('onay', data)
    const changed = token.slice(0, 20) + (token[20] === 'A' ? 'B' : 'A') + token.slice(21)
    expect(readToken('onay', changed)).toBeNull()
    expect(readToken('onay', 'not-a-token')).toBeNull()
    expect(readToken('onay', '')).toBeNull()
  })

  it('refuses a token made with another secret', () => {
    const token = makeToken('cikis', data)
    vi.stubEnv('NEWSLETTER_SECRET', 'b'.repeat(32))
    expect(readToken('cikis', token)).toBeNull()
  })

  it('lets a confirm link expire after 7 days but never an unsubscribe link', () => {
    const now = Date.UTC(2026, 8, 29)
    const confirm = makeToken('onay', data, now)
    expect(readToken('onay', confirm, now + CONFIRM_TTL_MS - 1000)).toEqual(data)
    expect(readToken('onay', confirm, now + CONFIRM_TTL_MS + 1000)).toBeNull()
    const leave = makeToken('cikis', data, now)
    expect(readToken('cikis', leave, now + 10 * 365 * 86_400_000)).toEqual(data)
  })

  it('refuses to make or read a token in production without a 32-character secret', () => {
    vi.stubEnv('NODE_ENV', 'production')
    // '' counts as unset (||): the case where production must not fall back to the public development key
    for (const secret of ['', 'short']) {
      vi.stubEnv('NEWSLETTER_SECRET', secret)
      expect(() => makeToken('onay', data)).toThrow('NEWSLETTER_SECRET')
      expect(() => readToken('onay', 'x'.repeat(60))).toThrow('NEWSLETTER_SECRET')
    }
  })

  it('names the misconfiguration, so a log line reads NewsletterSecretMissing and not just Error', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEWSLETTER_SECRET', '')
    expect(() => makeToken('onay', data)).toThrow(expect.objectContaining({ name: 'NewsletterSecretMissing' }))
    expect(() => readToken('cikis', 'x'.repeat(60))).toThrow(expect.objectContaining({ name: 'NewsletterSecretMissing' }))
  })

  it('works in development without a secret (a fixed development-only key)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEWSLETTER_SECRET', '')
    expect(readToken('onay', makeToken('onay', data))).toEqual(data)
  })
})

describe('the security package tokens (2026-10-22)', () => {
  it('a wcabag carries the member and the WCA account for 10 minutes, and opens no other door', () => {
    const now = Date.UTC(2026, 9, 22, 12)
    const data = { email: 'ayse@example.com', locale: 'tr' as const, wcaId: '2019TEME01', name: 'Ayşe Yılmaz' }
    const token = makeToken('wcabag', data, now)
    expect(readToken('wcabag', token, now + LINK_TTL_MS)).toEqual(data)
    expect(readToken('wcabag', token, now + LINK_TTL_MS + 1000)).toBeNull()
    expect(readToken('hesap', token, now)).toBeNull()
    expect(readToken('wcabag', makeToken('wcabag', { email: 'ayse@example.com', locale: 'tr' }, now), now)).toBeNull() // no WCA ID
  })

  it('a signed confirm code gives its code back, and nothing for a made-up or changed one', () => {
    const code = 'k'.repeat(43)
    expect(codeOf(signCode(code))).toBe(code)
    expect(codeOf(code)).toBeNull()
    expect(codeOf(`${'x'.repeat(43)}.${signCode(code).split('.')[1]}`)).toBeNull()
    expect(codeOf(`${signCode(code)}x`)).toBeNull()
    expect(codeOf(`${signCode(code)}.more`)).toBeNull()
  })
})
