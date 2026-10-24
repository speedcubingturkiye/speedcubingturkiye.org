// lib/phone.test.ts
import { describe, expect, it } from 'vitest'
import { flagOf, phoneCountries, readPhone } from '@/lib/phone'

const TR = { number: '+905054182759', country: 'TR', national: '505 418 27 59' }

describe('readPhone', () => {
  it('reads a Turkish mobile number however it is written, the national 0 after +90 too', () => {
    for (const typed of ['0505 418 27 59', '505 418 27 59', '(505) 418-27-59', ' 0505.418.27.59 ', '5054182759', '+90 505 418 27 59', '+90 0505 418 27 59', '0090 505 418 27 59', '90 505 418 27 59']) {
      expect(readPhone('TR', typed)).toEqual(TR)
    }
  })

  it('reads a number in the chosen country, and one written with its own code whatever was chosen', () => {
    expect(readPhone('DE', '01515 2468135')).toEqual({ number: '+4915152468135', country: 'DE', national: '1515 2468135' })
    expect(readPhone('TR', '+49 1515 2468135')).toMatchObject({ country: 'DE' })
    expect(readPhone('DE', '+90 505 418 27 59')).toEqual(TR)
    expect(readPhone('XX', '0505 418 27 59')).toEqual(TR) // a list value it does not know: Türkiye
  })

  it('refuses a landline, a number too short or too long, letters and a formula', () => {
    for (const typed of ['0312 418 27 59', '0505 418 27', '0505 418 27 591', '', 'abc', '=1+2', '+90']) {
      expect(readPhone('TR', typed)).toBeNull()
    }
  })

  it('refuses a made-up number: the last seven digits all the same or in a row', () => {
    for (const typed of ['0555 555 55 55', '0532 000 00 00', '0532 123 45 67', '0544 765 43 21', '0505 012 34 56']) {
      expect(readPhone('TR', typed)).toBeNull()
    }
  })
})

describe('phoneCountries', () => {
  it('puts Türkiye first, then every country by its name', () => {
    const list = phoneCountries('tr')
    expect(list[0]).toEqual({ code: 'TR', dial: '90', name: 'Türkiye' })
    expect(list.length).toBeGreaterThan(200)
    expect(list.findIndex((c) => c.code === 'DE')).toBeLessThan(list.findIndex((c) => c.code === 'AZ')) // Almanya, Azerbaycan
    expect(phoneCountries('en').find((c) => c.code === 'DE')).toEqual({ code: 'DE', dial: '49', name: 'Germany' })
  })

  it('draws a flag from the two letters', () => {
    expect([flagOf('TR'), flagOf('DE')]).toEqual(['🇹🇷', '🇩🇪'])
  })
})
