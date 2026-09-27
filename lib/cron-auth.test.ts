// lib/cron-auth.test.ts
import { describe, expect, it } from 'vitest'
import { authorized } from '@/lib/cron-auth'

describe('authorized', () => {
  it('accepts the right token', () => {
    expect(authorized('Bearer right-token', 'right-token')).toBe(true)
  })

  it('rejects a wrong token of equal length', () => {
    expect('wrong-token'.length).toBe('right-token'.length) // the case timingSafeEqual alone would not reject safely
    expect(authorized('Bearer wrong-token', 'right-token')).toBe(false)
  })

  it('rejects a token of a different length', () => {
    expect(authorized('Bearer short', 'a-much-longer-secret')).toBe(false)
  })

  it('rejects a null header', () => {
    expect(authorized(null, 'right-token')).toBe(false)
  })
})
