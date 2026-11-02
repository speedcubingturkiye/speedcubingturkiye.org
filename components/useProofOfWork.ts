'use client'

import { useRef, useState } from 'react'

/**
 * The contact form's proof of work (lib/pow.ts, 2026-10-27): on the form's first focus the browser fetches a challenge
 * from the site and finds its number while the message is written, a second or less. Nothing leaves the site and
 * nothing stays in the browser. A failed fetch is tried again on the next focus.
 */
export function useProofOfWork() {
  const [pow, setPow] = useState('')
  const started = useRef(false)

  async function start() {
    if (started.current) return
    started.current = true
    try {
      const { salt, challenge, max } = await (await fetch('/api/pow', { cache: 'no-store' })).json()
      const number = await solvePow(salt, challenge.split('.')[0], max)
      if (number !== null) setPow([salt, challenge, number].join(','))
    } catch {
      started.current = false
    }
  }

  return { pow, start }
}

/** The number n up to `max` whose SHA-256 of `salt + n` is `hash`, or null. Hashes go 256 at a time: one at a time,
 *  each would wait for the one before. */
export async function solvePow(salt: string, hash: string, max: number): Promise<number | null> {
  const encoder = new TextEncoder()
  for (let first = 0; first <= max; first += 256) {
    const batch = Array.from({ length: Math.min(256, max - first + 1) }, (_, i) => first + i)
    const digests = await Promise.all(batch.map((n) => crypto.subtle.digest('SHA-256', encoder.encode(`${salt}${n}`))))
    const found = digests.findIndex((d) => Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('') === hash)
    if (found >= 0) return batch[found]
  }
  return null
}
