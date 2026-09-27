// lib/wca/demo.test.ts
import { describe, expect, it } from 'vitest'
import { demoCompetition } from '@/lib/wca/demo'
import { registerAction, registrationStatus } from '@/lib/wca/status'
import type { CompetitionDetail } from '@/lib/wca/types'

// Only the fields the samples and the status functions read
const base = { id: 'NewAgeTurkey2026', name: 'New Age Turkey 2026', competitor_limit: 90, spots_left: 0, 'registration_full?': true } as CompetitionDetail

describe('demoCompetition', () => {
  it('keeps each sample in its registration state', () => {
    const now = Date.parse('2026-09-28T12:00:00Z')
    const at = new Date(now)
    const soon = demoCompetition('OrnekKayitYakinda', base, now)
    const open = demoCompetition('OrnekKayitAcik', base, now)
    const closed = demoCompetition('OrnekKayitKapandi', base, now)
    expect(registrationStatus(soon, soon, at)).toBe('opens_soon')
    expect(registrationStatus(open, open, at)).toBe('open')
    expect(registerAction(open, open, at)).toBe('register')
    expect(registrationStatus(closed, closed, at)).toBe('closed')
    expect(closed.start_date > '2026-09-28').toBe(true) // not held yet
  })
})
