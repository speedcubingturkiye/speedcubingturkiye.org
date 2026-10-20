// lib/membership-rules.test.ts
import { describe, expect, it } from 'vitest'
import { ABROAD, ageOn, parseApplication, PROVINCE_CHOICES } from '@/lib/membership-rules'

const TODAY = '2026-10-19'
const form = (over: Record<string, string> = {}) => {
  const f = new FormData()
  const base: Record<string, string> = { firstName: 'Ayşe', lastName: 'Yılmaz', email: ' Ayse@Example.com ', birthDate: '1990-05-04', city: 'İstanbul', competed: 'no', wcaId: '' }
  for (const [k, v] of Object.entries({ ...base, ...over })) f.set(k, v)
  return f
}

describe('PROVINCE_CHOICES', () => {
  it('lists the 81 provinces once each, in Turkish alphabetical order', () => {
    expect(PROVINCE_CHOICES).toHaveLength(81)
    expect(new Set(PROVINCE_CHOICES).size).toBe(81)
    expect(PROVINCE_CHOICES.indexOf('Kırıkkale')).toBeLessThan(PROVINCE_CHOICES.indexOf('Kilis'))
    expect(PROVINCE_CHOICES.indexOf('Sivas')).toBeLessThan(PROVINCE_CHOICES.indexOf('Şanlıurfa'))
    expect(PROVINCE_CHOICES.at(-1)).toBe('Zonguldak')
  })
})

describe('ageOn', () => {
  it('counts whole years, a year older on the birthday', () => {
    expect(ageOn('2008-10-19', TODAY)).toBe(18)
    expect(ageOn('2008-10-20', TODAY)).toBe(17)
  })
  it('turns someone born on 29 February a year older on 1 March', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17)
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18)
  })
})

describe('parseApplication', () => {
  it('accepts an adult, lower-cases the email and upper-cases the WCA ID', () => {
    const r = parseApplication(form({ competed: 'yes', wcaId: '2019teme01', helps: 'on', newsletter: 'on' }), TODAY)
    expect(r).toEqual({
      ok: true,
      data: { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', wcaId: '2019TEME01', helps: true, newsletter: true },
    })
    expect(parseApplication(form(), TODAY)).toMatchObject({ ok: true, data: { helps: false, newsletter: false } })
  })

  it('accepts abroad as the city', () => {
    expect(parseApplication(form({ city: ABROAD }), TODAY).ok).toBe(true)
  })

  it('rejects bad fields', () => {
    const bad: Record<string, string>[] = [
      { firstName: '' },
      { lastName: '=HYPERLINK("x")' },
      { firstName: 'a'.repeat(61) },
      { email: 'nope' },
      { birthDate: '2026-02-30' },
      { birthDate: '2026-10-20' },
      { birthDate: '1899-12-31' },
      { city: 'Gotham' },
      { competed: '' },
      { competed: 'maybe' },
    ]
    for (const over of bad) expect(parseApplication(form(over), TODAY)).toEqual({ ok: false, error: 'invalid' })
  })

  it('asks someone who has competed for their WCA ID, and drops one given by someone who has not', () => {
    expect(parseApplication(form({ competed: 'yes' }), TODAY)).toEqual({ ok: false, error: 'wcaId' })
    expect(parseApplication(form({ competed: 'yes', wcaId: '2019TEM01' }), TODAY)).toEqual({ ok: false, error: 'wcaId' })
    const r = parseApplication(form({ competed: 'no', wcaId: '2019TEME01' }), TODAY)
    expect(r.ok && r.data.wcaId).toBe('')
  })

  it('asks someone under 18 for the guardian box and records it', () => {
    expect(parseApplication(form({ birthDate: '2010-01-01' }), TODAY)).toEqual({ ok: false, error: 'guardian' })
    const r = parseApplication(form({ birthDate: '2010-01-01', guardian: 'on' }), TODAY)
    expect(r.ok && r.data.guardian).toBe(true)
  })

  it('ignores the guardian box for an adult', () => {
    const r = parseApplication(form({ guardian: 'on' }), TODAY)
    expect(r.ok && r.data.guardian).toBe(false)
  })
})
