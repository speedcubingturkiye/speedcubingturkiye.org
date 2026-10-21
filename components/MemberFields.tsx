'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ABROAD, ageOn, PROVINCE_CHOICES } from '@/lib/membership-rules'
import type { MemberFields as Values } from '@/lib/membership-sheet'

export const control = 'w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg'
export const field = `mt-1 ${control}`
export const check = 'flex items-start gap-2 text-sm text-fg-2'

/**
 * A member's details, shared by the Üye ol forms (spec 2026-10-19 §2, 2026-10-21 WCA ile kaydol) and Hesabım: names,
 * date of birth, city, the parent or guardian box (04.2026.01 madde 2) and the helps box. The WCA ID is not here: it
 * comes only from a WCA login.
 * - The guardian box shows once the date of birth makes the member younger than 18, or when the server asked for it
 *   (`error`, a form sent without JS); the action checks again.
 * - `today` is the Istanbul date from the page, so the server and the browser draw the same fields.
 * - `defaults` fills them in. `afterNames` goes between the names and the date of birth (Üye ol's address).
 */
export function MemberFields({ today, defaults, error, afterNames }: { today: string; defaults?: Values; error?: string; afterNames?: ReactNode }) {
  const t = useTranslations('membership')
  const [birthDate, setBirthDate] = useState(defaults?.birthDate ?? '')
  const minor = (/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) < 18) || error === 'guardian'

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
