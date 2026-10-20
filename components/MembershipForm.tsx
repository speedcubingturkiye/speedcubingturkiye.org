'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { applyForMembership } from '@/app/actions/membership'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { MembershipState } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'
import { ABROAD, ageOn, PROVINCE_CHOICES } from '@/lib/membership-rules'

const initial: MembershipState = { ok: false }
const failed: MembershipState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)
const control = 'w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg'
const field = `mt-1 ${control}`
const check = 'flex items-start gap-2 text-sm text-fg-2'

/**
 * The Üye ol form (spec 2026-10-19 §2), built like ContactForm. The parent or guardian box (04.2026.01 madde 2) shows
 * once the date of birth makes the applicant younger than 18, and the WCA ID field once the applicant says they have
 * competed; either also shows when the server asked for it (a form sent without JS), and the action checks again.
 * `today` is the Istanbul date from the page, so the server and the browser draw the same form.
 */
export function MembershipForm({ locale, today }: { locale: Locale; today: string }) {
  const t = useTranslations('membership')
  const forms = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(applyForMembership, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)
  const [birthDate, setBirthDate] = useState('')
  const [competed, setCompeted] = useState('')
  const minor = (/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) < 18) || state.error === 'guardian'
  const askWcaId = competed === 'yes' || state.error === 'wcaId'

  return (
    <div className="grid max-w-xl gap-4">
      {state.ok ? null : (
        <form action={formAction} onSubmit={onSubmit} onFocusCapture={onFocusCapture} className="grid gap-4">
          <input type="hidden" name="ts" value={ts} />
          <input type="hidden" name="locale" value={locale} />
          {/* honeypot */}
          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              {t('firstName')}
              <input className={field} name="firstName" required maxLength={60} autoComplete="given-name" />
            </label>
            <label className="block text-sm font-semibold">
              {t('lastName')}
              <input className={field} name="lastName" required maxLength={60} autoComplete="family-name" />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            {t('email')}
            <input className={field} name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>

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
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            {t('city')}
            {/* The browser's own arrow sits 4px from the edge and its box comes out 3px shorter than the inputs; drawn
                here instead, it lines up with the date field's calendar icon, 12px in (globals.css) */}
            <span className="relative mt-1 block">
              <select className={`${control} appearance-none pr-10 leading-5`} name="city" required defaultValue="">
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
                <input type="radio" name="competed" value="yes" required className="mt-1 accent-brand" onChange={() => setCompeted('yes')} />
                <span>{t('yes')}</span>
              </label>
              <label className={check}>
                <input type="radio" name="competed" value="no" className="mt-1 accent-brand" onChange={() => setCompeted('no')} />
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
                aria-describedby="wca-id-hint"
              />
              <span id="wca-id-hint" className="mt-1 block font-normal text-fg-2">
                {t('wcaIdHint')}
              </span>
            </label>
          ) : null}

          {minor ? (
            <label className={check}>
              <input type="checkbox" name="guardian" required className="mt-1 accent-brand" />
              <span>{t('guardian')}</span>
            </label>
          ) : null}

          <label className={check}>
            <input type="checkbox" name="helps" className="mt-1 accent-brand" />
            <span>{t('helps')}</span>
          </label>

          {/* The newsletter form's consent word for word; the membership link confirms it (spec 2026-10-20 §A) */}
          <label className={check}>
            <input type="checkbox" name="newsletter" className="mt-1 accent-brand" />
            <span>
              {forms('newsletterConsent')}{' '}
              <Link href="/kvkk#bulten" className="underline">
                {forms('newsletterPrivacy')}
              </Link>
            </span>
          </label>

          {/* KVKK md. 10: inform at the point of collection */}
          <p className="text-sm text-fg-2">
            {t('privacyNote')}{' '}
            <Link href="/kvkk#uyelik" className="underline">
              {forms('privacyLink')}
            </Link>
          </p>

          {/* aria-disabled, not disabled: a disabled button drops keyboard focus to <body> while the action runs */}
          <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
            {pending ? t('sending') : t('submit')}
          </button>
        </form>
      )}
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${state.ok ? 'text-ok' : 'text-brand-ink'}`}>
        {pending ? '' : state.ok ? t('sent') : state.error ? t(`error.${state.error}`) : ''}
      </p>
    </div>
  )
}
