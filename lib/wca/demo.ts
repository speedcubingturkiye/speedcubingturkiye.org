// lib/wca/demo.ts: development only, sample competition pages for registration states no real competition may be in
import type { CompetitionDetail } from './types'

/** The real competition the samples borrow everything else from: events, venue, people, tabs. */
export const DEMO_BASE = 'NewAgeTurkey2026'

const DAY = 86_400_000

// Days from now: registration opens, registration closes, the competition starts; spots left of the base's limit
const SAMPLES: Record<string, { name: string; open: number; close: number; start: number; left: number }> = {
  OrnekKayitYakinda: { name: 'Örnek Yarışma: Kayıt yakında', open: 7, close: 30, start: 45, left: 90 },
  OrnekKayitAcik: { name: 'Örnek Yarışma: Kayıt açık', open: -3, close: 20, start: 35, left: 42 },
  OrnekKayitKapandi: { name: 'Örnek Yarışma: Kayıt kapandı', open: -30, close: -2, start: 10, left: 12 },
}

/** A sample page id; only under `next dev`, so a production build never serves them (they 404 there). */
export function isDemo(id: string): boolean {
  return process.env.NODE_ENV === 'development' && id in SAMPLES
}

/** The base competition as sample `id`, its dates counted from now so each sample stays in its state. */
export function demoCompetition(id: string, base: CompetitionDetail, now: number = Date.now()): CompetitionDetail {
  const s = SAMPLES[id]
  const noon = Math.floor(now / DAY) * DAY + 9 * 3_600_000 // today 12:00 in Istanbul (UTC+3), for round times
  const at = (days: number) => new Date(noon + days * DAY).toISOString()
  return {
    ...base,
    id,
    name: s.name,
    registration_open: at(s.open),
    registration_close: at(s.close),
    start_date: at(s.start).slice(0, 10),
    end_date: at(s.start + 1).slice(0, 10),
    spots_left: s.left,
    'registration_full?': false,
  }
}
