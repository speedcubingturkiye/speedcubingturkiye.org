// lib/wca/status.test.ts
import { describe, expect, it } from 'vitest'
import { displayCity } from '@/lib/wca/city'
import { formatFee, formatResult } from '@/lib/wca/format'
import { isOngoing, registerAction, registrationStatus, spotsTaken, todayIstanbul } from '@/lib/wca/status'
import type { CompetitionDetail, CompetitionListItem } from '@/lib/wca/types'

// Real data: NewAgeTurkey2026 as served by the WCA API on 2026-09-25
const comp: CompetitionListItem = {
  id: 'NewAgeTurkey2026',
  name: 'New Age Turkey 2026',
  city: 'Istanbul',
  country_iso2: 'TR',
  start_date: '2026-10-31',
  end_date: '2026-11-01',
  registration_open: '2026-09-26T09:00:00.000Z',
  registration_close: '2026-10-26T14:00:00.000Z',
  announced_at: '2026-09-22T11:02:03.000Z',
  competitor_limit: 90,
  event_ids: ['333', '222'],
  url: 'https://www.worldcubeassociation.org/competitions/NewAgeTurkey2026',
  delegates: [],
  organizers: [],
}

const detail = (extra: Partial<CompetitionDetail> = {}): CompetitionDetail => ({
  ...comp,
  spots_left: 90,
  'registration_full?': false,
  base_entry_fee_lowest_denomination: 70000,
  currency_code: 'TRY',
  venue: 'Arabica Coffee House',
  venue_address: null,
  venue_details: null,
  latitude_degrees: 41.009504,
  longitude_degrees: 29.040312,
  tab_names: [],
  scoretaking_software: 'wca_live',
  ...extra,
})

const at = (iso: string) => new Date(iso)

describe('todayIstanbul', () => {
  it('uses Europe/Istanbul (UTC+3) for the calendar date', () => {
    expect(todayIstanbul(at('2026-11-01T20:59:00Z'))).toBe('2026-11-01')
    expect(todayIstanbul(at('2026-11-01T21:00:00Z'))).toBe('2026-11-02')
  })
})

describe('registrationStatus', () => {
  it('opens_soon before registration_open', () => {
    expect(registrationStatus(comp, null, at('2026-09-25T12:00:00Z'))).toBe('opens_soon')
    expect(registrationStatus(comp, null, at('2026-09-26T08:59:59Z'))).toBe('opens_soon')
  })
  it('open from registration_open (inclusive) until registration_close (exclusive)', () => {
    expect(registrationStatus(comp, null, at('2026-09-26T09:00:00Z'))).toBe('open')
    expect(registrationStatus(comp, null, at('2026-10-26T13:59:59Z'))).toBe('open')
  })
  it('closed from registration_close until the competition ends', () => {
    expect(registrationStatus(comp, null, at('2026-10-26T14:00:00Z'))).toBe('closed')
    expect(registrationStatus(comp, null, at('2026-11-01T20:00:00Z'))).toBe('closed') // Istanbul 23:00 on end_date
  })
  it('past once end_date is over in Istanbul', () => {
    expect(registrationStatus(comp, null, at('2026-11-01T21:30:00Z'))).toBe('past') // Istanbul 00:30 next day
    expect(registrationStatus(comp, detail({ 'registration_full?': true }), at('2026-12-01T00:00:00Z'))).toBe('past')
  })
  it('full when the detail says so, otherwise the time window decides', () => {
    const now = at('2026-10-01T12:00:00Z')
    expect(registrationStatus(comp, detail({ 'registration_full?': true }), now)).toBe('full')
    expect(registrationStatus(comp, detail({ spots_left: 0 }), now)).toBe('full')
    expect(registrationStatus(comp, detail({ spots_left: 5 }), now)).toBe('open')
  })
})

describe('registerAction', () => {
  it('register while open, the waiting list while full inside the window, nothing otherwise', () => {
    const now = at('2026-10-01T12:00:00Z')
    expect(registerAction(comp, detail({ spots_left: 5 }), now)).toBe('register')
    expect(registerAction(comp, detail({ 'registration_full?': true }), now)).toBe('waitingList')
    expect(registerAction(comp, detail({ 'registration_full?': true }), at('2026-10-26T14:00:00Z'))).toBeNull() // window closed
    expect(registerAction(comp, null, at('2026-09-25T12:00:00Z'))).toBeNull() // opens soon
  })
})

describe('isOngoing', () => {
  it('is true from Istanbul midnight on start_date through end_date', () => {
    expect(isOngoing(comp, at('2026-10-30T20:59:00Z'))).toBe(false)
    expect(isOngoing(comp, at('2026-10-30T21:00:00Z'))).toBe(true)
    expect(isOngoing(comp, at('2026-11-01T12:00:00Z'))).toBe(true)
    expect(isOngoing(comp, at('2026-11-01T21:00:00Z'))).toBe(false)
  })
})

describe('spotsTaken', () => {
  it('is competitor_limit minus spots_left when both are numbers', () => {
    expect(spotsTaken(detail({ competitor_limit: 90, spots_left: 30 }))).toBe(60)
    expect(spotsTaken(detail({ competitor_limit: 90, spots_left: 0 }))).toBe(90)
  })
  it('is null when either side is missing', () => {
    expect(spotsTaken(detail({ competitor_limit: null, spots_left: 30 }))).toBe(null)
    expect(spotsTaken(detail({ competitor_limit: 90, spots_left: null }))).toBe(null)
  })
})

describe('formatResult', () => {
  it('formats centiseconds', () => {
    expect(formatResult(479, '333', 'single')).toBe('4.79')
    expect(formatResult(7697, '666', 'single')).toBe('1:16.97')
    expect(formatResult(8653, '333', 'average')).toBe('1:26.53')
  })
  it('handles DNF/DNS/no result', () => {
    expect(formatResult(-1, '333', 'average')).toBe('DNF')
    expect(formatResult(-2, '333', 'single')).toBe('DNS')
    expect(formatResult(0, '333fm', 'average')).toBe('—')
  })
  it('formats fewest moves as moves and mean as moves/100', () => {
    expect(formatResult(22, '333fm', 'single')).toBe('22')
    expect(formatResult(2833, '333fm', 'average')).toBe('28.33')
  })
  it('decodes multi-blind', () => {
    expect(formatResult(850339107, '333mbf', 'single')).toBe('21/28 56:31')
    expect(formatResult(960109300, '333mbf', 'single')).toBe('3/3 18:13')
  })
})

describe('formatFee', () => {
  it('formats kuruş as ₺ and other currencies with their code', () => {
    expect(formatFee(70000, 'TRY')).toBe('₺700')
    expect(formatFee(12550, 'TRY')).toBe('₺125.50')
    expect(formatFee(1500, 'EUR')).toBe('15 EUR')
    expect(formatFee(null, 'TRY')).toBe('')
  })
})

describe('displayCity', () => {
  it('restores the Turkish spelling of provinces written in ASCII', () => {
    expect(displayCity('Istanbul')).toBe('İstanbul')
    expect(displayCity('Izmir')).toBe('İzmir')
    expect(displayCity('Diyarbakir')).toBe('Diyarbakır')
    expect(displayCity('ANKARA')).toBe('Ankara')
  })
  it('normalizes each comma-separated part and keeps unknown parts as they are', () => {
    expect(displayCity('Kadıköy, Istanbul')).toBe('Kadıköy, İstanbul')
    expect(displayCity('Nilüfer,Bursa')).toBe('Nilüfer, Bursa')
    expect(displayCity('Somewhere Else')).toBe('Somewhere Else')
    expect(displayCity('')).toBe('')
  })
})
