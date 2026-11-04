// lib/turnstile.test.ts: the robot check against Cloudflare's siteverify answer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { turnstileOk } from '@/lib/turnstile'

const form = (token = 'token') => {
  const data = new FormData()
  if (token) data.set('cf-turnstile-response', token)
  return data
}

const answer = (body: unknown, ok = true) => ({ ok, json: async () => body })

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET', 'secret')
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('the robot check', () => {
  it('passes a token Cloudflare made for this site and this form', async () => {
    vi.mocked(fetch).mockResolvedValue(answer({ success: true, hostname: 'speedcubingturkiye.org', action: 'contact' }) as never)
    expect(await turnstileOk(form(), '203.0.113.7', 'contact')).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(String((init as RequestInit).body)).toContain('remoteip=203.0.113.7')
  })

  it('refuses a token for another site, another form, a failed answer and a missing one', async () => {
    const replies = [
      { success: true, hostname: 'evil.example', action: 'contact' },
      { success: true, hostname: 'speedcubingturkiye.org', action: 'newsletter' },
      { success: false, hostname: 'speedcubingturkiye.org', action: 'contact' },
    ]
    for (const body of replies) {
      vi.mocked(fetch).mockResolvedValue(answer(body) as never)
      expect(await turnstileOk(form(), '203.0.113.7', 'contact')).toBe(false)
    }
    vi.mocked(fetch).mockResolvedValue(answer({ success: true, hostname: 'speedcubingturkiye.org', action: 'contact' }) as never)
    expect(await turnstileOk(form(''), null, 'contact')).toBe(false)
  })

  it('stays closed without the secret, and when Cloudflare fails, times out or answers an error', async () => {
    vi.stubEnv('TURNSTILE_SECRET', '')
    expect(await turnstileOk(form(), null, 'contact')).toBe(false)
    vi.stubEnv('TURNSTILE_SECRET', 'secret')
    vi.mocked(fetch).mockRejectedValue(new Error('timeout'))
    expect(await turnstileOk(form(), null, 'contact')).toBe(false)
    vi.mocked(fetch).mockResolvedValue(answer({}, false) as never)
    expect(await turnstileOk(form(), null, 'contact')).toBe(false)
  })
})
