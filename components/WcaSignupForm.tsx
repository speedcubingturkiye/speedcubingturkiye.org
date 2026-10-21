'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { signUpWithWca } from '@/app/actions/membership'
import { check, field, MemberFields } from '@/components/MemberFields'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { MembershipState } from '@/app/actions/types'
import { ABROAD, ageOn } from '@/lib/membership-rules'

const initial: MembershipState = { ok: false }
const failed: MembershipState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)

type Defaults = { firstName: string; lastName: string; email: string; birthDate: string }

/**
 * WCA ile kaydol (spec 2026-10-21): the Üye ol form, filled from the WCA login. `token` is its 30-minute token, sent
 * back with the form; it leaves the address bar on load. The WCA ID shows as verified, and with one the il ranking box
 * offers itself, the guardian's box too under 18. The address the WCA verified starts the membership at once.
 */
export function WcaSignupForm({ token, locale, today, wcaId, defaults }: { token: string; locale: Locale; today: string; wcaId?: string; defaults: Defaults }) {
  const t = useTranslations('membership')
  const account = useTranslations('account')
  const forms = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(signUpWithWca, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)
  const [birthDate, setBirthDate] = useState(defaults.birthDate)
  const [city, setCity] = useState('')
  const [ranking, setRanking] = useState(false)
  const offerRanking = Boolean(wcaId) && city !== ABROAD
  const minor = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate, today) < 18

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // The date of birth and the city live in MemberFields; the ranking boxes follow them through the form's change events
  function onChange(e: FormEvent<HTMLFormElement>) {
    const el = e.target as HTMLInputElement
    if (el.name === 'birthDate') setBirthDate(el.value)
    if (el.name === 'city') setCity(el.value)
  }

  const done = { started: t('started'), linked: state.ranking ? t('linkedRanking') : t('linked'), member: t('alreadyMember') }

  return (
    <div className="grid max-w-xl gap-4">
      {state.ok ? null : (
        <form action={formAction} onSubmit={onSubmit} onFocusCapture={onFocusCapture} onChange={onChange} className="grid gap-4">
          <input type="hidden" name="ts" value={ts} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="w" value={token} />
          {/* honeypot */}
          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {wcaId ? <p className="text-sm font-semibold">{t('wcaVerifiedId', { wcaId })}</p> : null}
          <MemberFields
            today={today}
            error={state.error}
            defaults={{ firstName: defaults.firstName, lastName: defaults.lastName, birthDate: defaults.birthDate, guardian: false, city: '', helps: false }}
            afterNames={
              <label className="block text-sm font-semibold">
                {t('email')}
                <input className={field} name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={defaults.email} />
              </label>
            }
          />
          {/* The newsletter form's consent word for word; with the address the WCA verified it starts at once */}
          <label className={check}>
            <input type="checkbox" name="newsletter" className="mt-1 accent-brand" />
            <span>
              {forms('newsletterConsent')}{' '}
              <Link href="/kvkk#bulten" className="underline">
                {forms('newsletterPrivacy')}
              </Link>
            </span>
          </label>
          {offerRanking ? (
            // Hesabım's explicit consent, word for word
            <label className={check}>
              <input type="checkbox" name="ranking" checked={ranking} onChange={(e) => setRanking(e.target.checked)} className="mt-1 accent-brand" />
              <span>
                {account('rankingConsent')}{' '}
                <Link href="/kvkk#il-siralamasi" className="underline">
                  {account('rankingPrivacy')}
                </Link>
              </span>
            </label>
          ) : null}
          {offerRanking && ranking && minor ? (
            <label className={check}>
              <input type="checkbox" name="rankingGuardian" required className="mt-1 accent-brand" />
              <span>{account('rankingGuardian')}</span>
            </label>
          ) : null}
          {/* KVKK md. 10: inform at the point of collection */}
          <p className="text-sm text-fg-2">
            {t('privacyNote')}{' '}
            <Link href="/kvkk#uyelik" className="underline">
              {forms('privacyLink')}
            </Link>
          </p>
          {/* aria-disabled, not disabled: a disabled button drops keyboard focus to <body> while the action runs */}
          <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
            {pending ? t('sending') : t('signUp')}
          </button>
        </form>
      )}
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${state.ok ? 'text-ok' : 'text-brand-ink'}`}>
        {pending ? '' : state.ok ? (state.kind ? done[state.kind] : t('sent')) : state.error ? t(`error.${state.error}`) : ''}
      </p>
    </div>
  )
}
