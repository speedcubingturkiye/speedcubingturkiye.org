'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { applyForMembership } from '@/app/actions/membership'
import { Done } from '@/components/Done'
import { check, field, MemberFields, Required } from '@/components/MemberFields'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { MembershipState } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'
import type { PhoneCountry } from '@/lib/phone'

const initial: MembershipState = { ok: false }
const failed: MembershipState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)

/**
 * The Üye ol form (spec 2026-10-19 §2), built like ContactForm: the address, the member's details (MemberFields, shared
 * with Hesabım), the newsletter box and the notice. `today` is the Istanbul date from the page, so the server and the
 * browser draw the same form. `intro` (the page's notice and its "WCA yarışmasında yarıştın mı?" question) goes with
 * the form: once it is sent, the result stands alone (2026-10-22). `waitsForChoice`: the form shows only once "Hayır"
 * is chosen (the page's `group`, 2026-10-24). `countries`: the phone's list (lib/phone.ts phoneCountries).
 */
export function MembershipForm({
  locale,
  today,
  countries,
  intro,
  waitsForChoice = false,
}: {
  locale: Locale
  today: string
  countries: PhoneCountry[]
  intro?: ReactNode
  waitsForChoice?: boolean
}) {
  const t = useTranslations('membership')
  const forms = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(applyForMembership, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)

  if (state.ok) return <Done statusRef={statusRef} message={t('sent')} />

  return (
    <>
      {intro}
      <div className={waitsForChoice ? 'hidden max-w-xl gap-4 group-has-[#yol-form:checked]:grid' : 'grid max-w-xl gap-4'}>
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

          <MemberFields
            today={today}
            countries={countries}
            error={state.error}
            afterNames={
              <label className="block text-sm font-semibold">
                {t('email')}
                <Required />
                <input className={field} name="email" type="email" required maxLength={254} autoComplete="email" />
              </label>
            }
          />

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
        <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-sm font-semibold text-brand-ink">
          {pending || !state.error ? '' : t(`error.${state.error}`)}
        </p>
      </div>
    </>
  )
}
