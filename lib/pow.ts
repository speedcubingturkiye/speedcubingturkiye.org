// lib/pow.ts: the contact form's proof of work (2026-10-27). A bot that posts the form without running the page (the
// spam that reached info@) cannot answer it; a visitor never sees it. The browser fetches a challenge (app/api/pow),
// finds the number behind it (components/useProofOfWork.ts) and sends both with the form; the action checks them here.
// The challenge is the SHA-256 of a salt and a secret number, signed by the site (signCode, purpose 'pow'), so the
// browser cannot make one up; the salt carries the challenge's expiry, and the hash binds the salt.
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { codeOf, signCode } from '@/lib/newsletter-token'

/** The secret number is at most this: a few tenths of a second of hashing in a browser */
export const POW_MAX = 50_000
/** Time to write the message */
const TTL_MS = 2 * 3_600_000

export type PowChallenge = { salt: string; challenge: string; max: number }

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

/** A new challenge; `challenge` is "<hash>.<signature>" */
export function powChallenge(now = Date.now()): PowChallenge {
  const salt = `${randomBytes(12).toString('hex')}.${now + TTL_MS}`
  return { salt, challenge: signCode(sha256(`${salt}${randomInt(POW_MAX + 1)}`), 'pow'), max: POW_MAX }
}

/** Whether the form's "<salt>,<challenge>,<number>" answers one of our challenges in time */
export function powSolved(answer: string, now = Date.now()): boolean {
  const [salt = '', challenge = '', number = ''] = answer.split(',')
  const hash = codeOf(challenge, 'pow')
  return hash !== null && /^\d{1,9}$/.test(number) && sha256(`${salt}${number}`) === hash && now < Number(salt.split('.')[1])
}
