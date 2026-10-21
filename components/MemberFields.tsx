'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ABROAD, ageOn, PROVINCE_CHOICES } from '@/lib/membership-rules'
import type { MemberFields as Values } from '@/lib/membership-sheet'

export const control = 'w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg'
export const field = `mt-1 ${control}`
export const check = 'flex items-start gap-2 text-sm text-fg-2'

/**
 * A member's details, shared by the Üye ol form (spec 2026-10-19 §2) and Hesabım (spec 2026-10-21): names, date of
 * birth, city, the WCA question with its ID, the parent or guardian box (04.2026.01 madde 2) and the helps box.
 * - The guardian box shows once the date of birth makes the member younger than 18. The WCA ID field shows once they
 *   say they have competed.
 * - Either also shows when the server asked for it (`error`, a form sent without JS), and the action checks again.
 * - `today` is the Istanbul date from the page, so the server and the browser draw the same fields.
 * - `defaults` fills them in for Hesabım. `afterNames` goes between the names and the date of birth (Üye ol's address).
 */
export function MemberFields({ today, defaults, error, afterNames }: { today: string; defaults?: Values; error?: string; afterNames?: ReactNode }) {
  const t = useTranslations('membership')
  const [birthDate, setBirthDate] = useState(defaults?.birthDate ?? '')
  const [competed, setCompeted] = useState(defaults ? (defaults.wcaId ? 'yes' : 'no') : '')
  const minor = (/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) < 18) || error === 'guardian'
  const askWcaId = competed === 'yes' || error === 'wcaId'

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t('firstName')}
          <input className={field} name="firstName" required maxLength={60} autoComplete="given-name" defaultValue={defaults?.firstName} />
        </label>
        <label className="block text-sm font-semibold">
          {t('lastName')}
          <input className={field} name="lastName" required maxLength={60} autoComplete="family-name" defaultValue={defaults?.lastName} />
        </label>
      </div>

      {afterNames}

      <label className="block text-sm font-semibold">
        {t('birthDate')}
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
        />
      </label>

      <label className="block text-sm font-semibold">
        {t('city')}
        {/* The browser's own arrow sits 4px from the edge and its box comes out 3px shorter than the inputs; drawn
            here instead, it lines up with the date field's calendar icon, 12px in (globals.css) */}
        <span className="relative mt-1 block">
          <select className={`${control} appearance-none pr-10 leading-5`} name="city" required defaultValue={defaults?.city ?? ''}>
            <option value="" disabled>
              {t('cityPlaceholder')}
            </option>
            {PROVINCE_CHOICES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={ABROAD}>{t('abroad')}</option>
          </select>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg">
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">{t('competed')}</legend>
        <div className="mt-2 flex gap-6">
          <label className={check}>
            <input type="radio" name="competed" value="yes" required defaultChecked={competed === 'yes'} className="mt-1 accent-brand" onChange={() => setCompeted('yes')} />
            <span>{t('yes')}</span>
          </label>
          <label className={check}>
            <input type="radio" name="competed" value="no" defaultChecked={competed === 'no'} className="mt-1 accent-brand" onChange={() => setCompeted('no')} />
            <span>{t('no')}</span>
          </label>
        </div>
      </fieldset>

      {askWcaId ? (
        <label className="block text-sm font-semibold">
          {t('wcaId')}
          <input
            className={field}
            name="wcaId"
            required
            maxLength={10}
            pattern="[0-9]{4}[A-Za-z]{4}[0-9]{2}"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            defaultValue={defaults?.wcaId}
            aria-describedby="wca-id-hint"
          />
          <span id="wca-id-hint" className="mt-1 block font-normal text-fg-2">
            {t('wcaIdHint')}
          </span>
        </label>
      ) : null}

      {minor ? (
        <label className={check}>
          <input type="checkbox" name="guardian" required defaultChecked={defaults?.guardian} className="mt-1 accent-brand" />
          <span>{t('guardian')}</span>
        </label>
      ) : null}

      <label className={check}>
        <input type="checkbox" name="helps" defaultChecked={defaults?.helps} className="mt-1 accent-brand" />
        <span>{t('helps')}</span>
      </label>
    </>
  )
}
