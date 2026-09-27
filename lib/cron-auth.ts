// lib/cron-auth.ts: pure, no I/O (kept out of app/api/cron/wca-check/route.ts: a route file may only export route fields)
import { timingSafeEqual } from 'node:crypto'

/** Constant-time compare; a length mismatch returns false without timingSafeEqual throwing. */
export function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
