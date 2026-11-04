// lib/form-guard.test.ts: the honeypot and the time trap shared by the forms
import { describe, expect, it } from 'vitest'
import { botCheck } from '@/lib/form-guard'

const NOW = Date.UTC(2026, 10, 3, 12)
const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

describe('the form guard', () => {
  it('tells a bot by the honeypot, whatever the stamp says', () => {
    expect(botCheck(form({ website: 'https://spam.example', ts: String(NOW - 10_000) }), NOW)).toBe('bot')
  })

  it('passes a form that carries no stamp; the robot check decides in the action (lib/turnstile.ts)', () => {
    expect(botCheck(form({}), NOW)).toBe(null)
    expect(botCheck(form({ ts: '' }), NOW)).toBe(null)
  })

  it('tells a bot by a stamp that is not a number, or comes from the future', () => {
    expect(botCheck(form({ ts: 'abc' }), NOW)).toBe('bot')
    expect(botCheck(form({ ts: String(NOW + 60_000) }), NOW)).toBe('bot')
  })

  it('tells a form sent too fast, and lets a filled one through', () => {
    expect(botCheck(form({ ts: String(NOW - 1_000) }), NOW)).toBe('too_fast')
    expect(botCheck(form({ ts: String(NOW - 3_000) }), NOW)).toBe(null)
    expect(botCheck(form({ ts: String(NOW - 60_000) }), NOW)).toBe(null)
  })
})
