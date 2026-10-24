// lib/phone.ts: a member's phone number (2026-10-24), for the WhatsApp community the Secretary adds every member to.
// Google's numbering rules through libphonenumber-js, its mobile set: WhatsApp needs a mobile number. Shared by the
// form and the server action, so nothing here may import server-only code.
import { getCountries, getCountryCallingCode, isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/mobile'

/** Türkiye: first in the form's list and chosen until the member picks another */
export const PHONE_COUNTRY: CountryCode = 'TR'

/** "+905054182759", its country and the number as written after the country code ("505 418 27 59") */
export type Phone = { number: string; country: CountryCode; national: string }

/**
 * The number typed after the list's `country`, or null. A number written with a code of its own ("+49 …", "0049 …")
 * keeps that code; a national 0 goes, after "+90" too. Only a mobile number reads, and not a made-up one: the last
 * seven digits all the same (555 55 55) or in a row (123 45 67).
 */
export function readPhone(country: string, raw: string): Phone | null {
  const phone = parsePhoneNumberFromString(raw, { defaultCountry: isSupportedCountry(country) ? country : PHONE_COUNTRY, extract: false })
  if (!phone?.country || !phone.isValid() || madeUp(phone.nationalNumber)) return null
  // "+90 505 418 27 59" without its "+90 "
  return { number: phone.number, country: phone.country, national: phone.formatInternational().slice(phone.countryCallingCode.length + 2) }
}

function madeUp(national: string): boolean {
  const last = national.slice(-7)
  return /^(\d)\1{6}$/.test(last) || '01234567890'.includes(last) || '09876543210'.includes(last)
}

/** The country's flag as an emoji: its two letters as regional indicator symbols ("TR": 🇹🇷) */
export const flagOf = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))

export type PhoneCountry = { code: CountryCode; dial: string; name: string }

/** The form's list: Türkiye, then every country by its name in `locale`. Made on the server and handed to the form, so
 *  the browser never names a country differently from the server's page. */
export function phoneCountries(locale: string): PhoneCountry[] {
  const names = new Intl.DisplayNames([locale], { type: 'region' })
  const byName = new Intl.Collator(locale)
  const all = getCountries().map((code) => ({ code, dial: getCountryCallingCode(code), name: names.of(code) ?? code }))
  return [...all.filter((c) => c.code === PHONE_COUNTRY), ...all.filter((c) => c.code !== PHONE_COUNTRY).sort((a, b) => byName.compare(a.name, b.name))]
}
