// lib/pow.test.ts: the contact form's proof of work, the browser's solver against the server's check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { solvePow } from '@/components/useProofOfWork'
import { signCode } from '@/lib/newsletter-token'
import { powChallenge, powSolved } from '@/lib/pow'

const NOW = Date.UTC(2026, 9, 27, 12)

beforeEach(() => vi.stubEnv('NEWSLETTER_SECRET', 'a'.repeat(32)))
afterEach(() => vi.unstubAllEnvs())

async function solved() {
  const { salt, challenge, max } = powChallenge(NOW)
  const number = await solvePow(salt, challenge.split('.')[0], max)
  return { salt, challenge, number: number ?? -1 }
}

describe('the contact form proof of work', () => {
  it('passes the number the browser finds, until the challenge expires two hours on', async () => {
    const { salt, challenge, number } = await solved()
    expect(number).toBeGreaterThanOrEqual(0)
    expect(powSolved(`${salt},${challenge},${number}`, NOW + 60_000)).toBe(true)
    expect(powSolved(`${salt},${challenge},${number}`, NOW + 2 * 3_600_000)).toBe(false)
  })

  it('refuses a wrong number, a challenge it did not sign, one signed for another use, a later expiry and nothing', async () => {
    const { salt, challenge, number } = await solved()
    const [hash] = challenge.split('.')
    for (const answer of [
      `${salt},${challenge},${number + 1}`,
      `${salt},${hash}.forged,${number}`,
      `${salt},${signCode(hash)},${number}`,
      `${salt.split('.')[0]}.${NOW + 9e9},${challenge},${number}`,
      '',
      'a,b,c',
    ]) {
      expect(powSolved(answer, NOW)).toBe(false)
    }
  })
})
