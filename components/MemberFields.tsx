'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import localFont from 'next/font/local'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ProvinceOptions } from '@/components/ProvinceOptions'
import { ageOn } from '@/lib/membership-rules'
import type { MemberFields as Values } from '@/lib/membership-sheet'
import { flagOf, PHONE_COUNTRY, readPhone, type PhoneCountry } from '@/lib/phone'

// The flags' font: Windows has no flag emoji of its own. Twemoji's flags (CC BY 4.0) through
// country-flag-emoji-polyfill (MIT); only the regional indicators draw with it, so it loads where a flag shows
const flags = localFont({
  src: '../node_modules/country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2',
  variable: '--font-flags',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+1F1E6-1F1FF' }],
})

// A read-only field (WCA ile kaydol's date of birth) sits on the panel colour, so it does not look like one to type in
export const control = 'w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg [&[readonly]]:bg-bg-2 [&[readonly]]:text-fg-2'
export const field = `mt-1 ${control}`
export const check = 'flex items-start gap-2 text-sm text-fg-2'

/** The red mark of a required field (2026-10-24); the field's own `required` tells screen readers, so they skip it */
export function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-brand-ink">
      *
    </span>
  )
}

/**
 * Telefon (2026-10-24): the country code's list, Türkiye first and chosen, and the number after it. A number that reads
 * is put in its country's form when the field is left, or at once when it comes pasted or autofilled: "0505…" and
 * "+90 0505…" become "505 …", and one written with another code ("+49 …") picks that country. One that does not read
 * (lib/phone.ts: a mobile number, not a made-up one) is marked and stops the form; the action reads it again.
 */
function PhoneField({ countries, defaultValue }: { countries: PhoneCountry[]; defaultValue?: string }) {
  const t = useTranslations('membership')
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  // Hesabım's saved number, in its country; one that no longer reads stays as it was, to be put right
  const saved = defaultValue ? readPhone(PHONE_COUNTRY, defaultValue) : null
  const [country, setCountry] = useState<string>(saved?.country ?? PHONE_COUNTRY)
  const [number, setNumber] = useState(saved?.national ?? defaultValue ?? '')
  const [wrong, setWrong] = useState(false)

  // An empty field is left to `required`; the browser says the mark's words when the form is sent
  function settle(code: string, value: string) {
    const phone = readPhone(code, value)
    const bad = value.trim() !== '' && !phone
    setCountry(phone?.country ?? code)
    setNumber(phone?.national ?? value)
    setWrong(bad)
    input.current?.setCustomValidity(bad ? t('error.phone') : '')
  }

  return (
    <div className="text-sm font-semibold">
      <label htmlFor={`${id}-number`} className="block">
        {t('phone')}
        <Required />
      </label>
      <div className="mt-1 flex">
        {/* The list itself, see-through over the flag and code it shows: closed it reads "🇹🇷 +90", open it names the
            countries, with their flags where the browser draws the list on the page (.phone-country, globals.css). Its
            own colours, as the list it opens takes them (white on white in the dark theme without) */}
        <span className={`${flags.variable} relative flex shrink-0 [font-family:var(--font-flags),var(--font-sans)]`}>
          <select
            name="phoneCountry"
            value={country}
            onChange={(e) => settle(e.target.value, number)}
            aria-label={t('phoneCountry')}
            className="phone-country peer absolute inset-0 bg-bg text-fg opacity-0"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code} data-flag={flagOf(c.code)}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="flex items-center gap-1.5 border border-r-0 border-line bg-bg px-3 text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
          >
            {flagOf(country)} +{countries.find((c) => c.code === country)?.dial}
            {/* the city list's arrow */}
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </span>
        </span>
        <input
          ref={input}
          id={`${id}-number`}
          className={`${control} min-w-0 flex-1 aria-invalid:border-brand-ink`}
          name="phone"
          type="tel"
          inputMode="tel"
          required
          maxLength={24}
          autoComplete="tel"
          placeholder={country === PHONE_COUNTRY ? '5XX XXX XX XX' : undefined}
          value={number}
          onChange={(e) => {
            // Pasted, dropped or autofilled, or being put right after the mark: at once; typed: when the field is left
            const typed = /^(insertText|insertCompositionText|delete)/.test((e.nativeEvent as InputEvent).inputType ?? '')
            if (wrong || !typed) settle(country, e.target.value)
            else setNumber(e.target.value)
          }}
          onBlur={(e) => settle(country, e.target.value)}
          aria-invalid={wrong || undefined}
          aria-describedby={wrong ? `${id}-error` : undefined}
        />
      </div>
      {wrong ? (
        <p id={`${id}-error`} className="mt-1 font-normal text-brand-ink">
          {t('error.phone')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * A member's details, shared by the Üye ol forms (spec 2026-10-19 §2, 2026-10-21 WCA ile kaydol) and Hesabım: names,
 * phone, date of birth, city, the parent or guardian box (04.2026.01 madde 2), the helps box and the WhatsApp chat
 * groups box. The phone is required: every member joins the WhatsApp community with it (2026-10-24). The WCA ID is not
 * here: it comes only from a WCA login. A required field carries the red mark (2026-10-24).
 * - The guardian box shows once the date of birth makes the member younger than 18, or when the server asked for it
 *   (`error`, a form sent without JS); the action checks again.
 * - `today` is the Istanbul date from the page, so the server and the browser draw the same fields; `countries`, the
 *   phone's list, comes from the page too (lib/phone.ts phoneCountries).
 * - `defaults` fills them in. `afterNames` goes between the names and the phone (Üye ol's address).
 * - `birthDateLocked`: WCA ile kaydol's date of birth is the WCA's, not to be changed here (2026-10-22); the action
 *   takes it from the WCA token whatever the form sends.
 */
export function MemberFields({
  today,
  countries,
  defaults,
  error,
  afterNames,
  birthDateLocked = false,
}: {
  today: string
  countries: PhoneCountry[]
  defaults?: Values
  error?: string
  afterNames?: ReactNode
  birthDateLocked?: boolean
}) {
  const t = useTranslations('membership')
  const [birthDate, setBirthDate] = useState(defaults?.birthDate ?? '')
  const minor = (/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) < 18) || error === 'guardian'

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t('firstName')}
          <Required />
          <input className={field} name="firstName" required maxLength={60} autoComplete="given-name" defaultValue={defaults?.firstName} />
        </label>
        <label className="block text-sm font-semibold">
          {t('lastName')}
          <Required />
          <input className={field} name="lastName" required maxLength={60} autoComplete="family-name" defaultValue={defaults?.lastName} />
        </label>
      </div>

      {afterNames}

      <PhoneField countries={countries} defaultValue={defaults?.phone} />

      <label className="block text-sm font-semibold">
        {t('birthDate')}
        <Required />
        <input
          className={field}
          name="birthDate"
          type="date"
          required
          min="1900-01-01"
          max={today}
          autoComplete="bday"
          defaultValue={defaults?.birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          readOnly={birthDateLocked}
          aria-describedby={birthDateLocked ? 'birth-date-wca' : undefined}
        />
      </label>
      {birthDateLocked ? (
        <p id="birth-date-wca" className="-mt-2 text-sm text-fg-2">
          {t('birthDateWca')}
        </p>
      ) : null}

      <label className="block text-sm font-semibold">
        {t('city')}
        <Required />
        {/* The browser's own arrow sits 4px from the edge and its box comes out 3px shorter than the inputs; drawn
            here instead, it lines up with the date field's calendar icon, 12px in (globals.css) */}
        <span className="relative mt-1 block">
          <select className={`${control} appearance-none pr-10 leading-5`} name="city" required defaultValue={defaults?.city ?? ''}>
            <option value="" disabled>
              {t('cityPlaceholder')}
            </option>
            <ProvinceOptions popular={t('popularProvinces')} all={t('allProvincesGroup')} abroad={t('abroad')} />
          </select>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg">
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </span>
      </label>

      {minor ? (
        <label className={check}>
          <input type="checkbox" name="guardian" required defaultChecked={defaults?.guardian} className="mt-1 accent-brand" />
          <span>
            {t('guardian')}
            <Required />
          </span>
        </label>
      ) : null}

      <label className={check}>
        <input type="checkbox" name="helps" defaultChecked={defaults?.helps} className="mt-1 accent-brand" />
        <span>{t('helps')}</span>
      </label>

      {/* The community comes with the phone; the chat groups, where each group sees the number, only with this box */}
      <label className={check}>
        <input type="checkbox" name="chat" defaultChecked={defaults?.chat} className="mt-1 accent-brand" />
        <span>
          {t('chat')}{' '}
          <Link href="/kvkk#whatsapp" className="underline">
            {t('chatPrivacy')}
          </Link>
        </span>
      </label>
    </>
  )
}
