'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { sendContact } from '@/app/actions/contact'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import { CONTACT_SUBJECTS, type ActionState, type ContactSubject } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'

const initial: ActionState = { ok: false }
const failed: ActionState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)
const field = 'mt-1 w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg'

export function ContactForm({ locale, presetSubject = 'genel' }: { locale: Locale; presetSubject?: ContactSubject }) {
  const t = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(sendContact, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)
  const [subject, setSubject] = useState<ContactSubject>(presetSubject)

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

          <label className="block text-sm font-semibold">
            {t('name')}
            <input className={field} name="name" required minLength={2} maxLength={100} autoComplete="name" />
          </label>

          <label className="block text-sm font-semibold">
            {t('email')}
            <input className={field} name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>

          <label className="block text-sm font-semibold">
            {t('subject')}
            <select className={field} name="subject" defaultValue={presetSubject} onChange={(e) => setSubject(e.target.value as ContactSubject)}>
              {CONTACT_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {t(`subjects.${s}`)}
                </option>
              ))}
            </select>
          </label>

          {/* A title for a subject the list does not have: only "Diğer" shows it, and the action accepts it only then. The select
              stays uncontrolled (a choice made before hydration is not reset); the state mirrors it. Without JS the field never
              shows and the form still submits. */}
          {subject === 'diger' ? (
            <label className="block text-sm font-semibold">
              {t('subjectTitle')}
              <input className={field} name="title" maxLength={100} autoComplete="off" />
            </label>
          ) : null}

          <label className="block text-sm font-semibold">
            {t('message')}
            <textarea className={field} name="message" required minLength={10} maxLength={5000} rows={6} />
          </label>

          {/* KVKK md. 10: inform at the point of collection */}
          <p className="text-sm text-fg-2">
            {t('privacyNote')}{' '}
            <Link href="/kvkk" className="underline">
              {t('privacyLink')}
            </Link>
          </p>

          {/* aria-disabled, not disabled: a disabled button drops keyboard focus to <body> while the action runs */}
          <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
            {pending ? t('sending') : t('send')}
          </button>
        </form>
      )}
      {/* Always mounted so the result is announced (review item 21); empty while pending, so a repeated error is
          announced again; focused on success, when the form and its focused button go away */}
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${state.ok ? 'text-ok' : 'text-brand-ink'}`}>
        {pending ? '' : state.ok ? t('sent') : state.error ? t(`error.${state.error}`) : ''}
      </p>
    </div>
  )
}
