'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { applyForMembership } from '@/app/actions/membership'
import { check, field, MemberFields } from '@/components/MemberFields'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { MembershipState } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'

const initial: MembershipState = { ok: false }
const failed: MembershipState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)

/**
 * The Üye ol form (spec 2026-10-19 §2), built like ContactForm: the address, the member's details (MemberFields, shared
 * with Hesabım), the newsletter box and the notice. `today` is the Istanbul date from the page, so the server and the
 * browser draw the same form.
 */
export function MembershipForm({ locale, today }: { locale: Locale; today: string }) {
  const t = useTranslations('membership')
  const forms = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(applyForMembership, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)

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

          <MemberFields
            today={today}
            error={state.error}
            afterNames={
              <label className="block text-sm font-semibold">
                {t('email')}
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
      )}
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${state.ok ? 'text-ok' : 'text-brand-ink'}`}>
        {pending ? '' : state.ok ? t('sent') : state.error ? t(`error.${state.error}`) : ''}
      </p>
    </div>
  )
}
