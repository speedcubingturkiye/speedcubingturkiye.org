'use client'

import { useTranslations } from 'next-intl'
import { requestLink } from '@/app/actions/account'
import { Done } from '@/components/Done'
import { field } from '@/components/MemberFields'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { AccountState } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'

const initial: AccountState = { ok: false }
const failed: AccountState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)

/** Hesabım's door (spec 2026-10-21): an address in, the same answer out for members and strangers alike. */
export function AccountLinkForm({ locale }: { locale: Locale }) {
  const t = useTranslations('account')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(requestLink, initial, failed, (s) => s.ok)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)

  if (state.ok) return <Done statusRef={statusRef} message={t('linkSent')} />

  return (
    <div className="grid max-w-xl gap-4">
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
          {t('email')}
          <input className={field} name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        {/* aria-disabled, not disabled: a disabled button drops keyboard focus to <body> while the action runs */}
        <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
          {pending ? t('sending') : t('sendLink')}
        </button>
      </form>
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-sm font-semibold text-brand-ink">
        {pending || !state.error ? '' : t(`error.${state.error}`)}
      </p>
    </div>
  )
}
