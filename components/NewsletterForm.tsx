// components/NewsletterForm.tsx
'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { subscribe } from '@/app/actions/newsletter'
import { useFormStartTime, useFormSubmit } from '@/components/useFormStartTime'
import type { ActionState } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'

const initial: ActionState = { ok: false }

/**
 * Newsletter sign-up shared by NewsletterStrip (other pages) and FollowBand (home, on red).
 * The status line is always mounted so assistive tech hears the result (review item 21), empty while pending so a
 * repeated error is announced again, and focused on success, when the form and its focused button go away.
 */
export function NewsletterForm({ locale, tone = 'default' }: { locale: Locale; tone?: 'default' | 'on-brand' }) {
  const t = useTranslations('forms')
  const [state, action, pending] = useActionState(subscribe, initial)
  const { ts, onFocusCapture } = useFormStartTime(state.ok)
  const { onSubmit, statusRef } = useFormSubmit(action, pending, state.ok)
  const onBrand = tone === 'on-brand'
  // On red: solid white border (white/70 is 2.8:1, below the 3:1 a field boundary needs) and pure white text (white/90 on
  // #E30A17 is 4.1:1, below AA); focus shows the band's white outline instead of a border change.
  const field = onBrand
    ? 'mt-1 w-full border border-white bg-transparent px-3 py-2 text-white'
    : 'mt-1 w-full border border-line bg-bg px-3 py-2 text-fg focus:border-fg'
  const statusClass = onBrand ? 'text-white' : state.ok ? 'text-ok' : 'text-brand-ink'

  return (
    <div className="grid gap-3">
      {state.ok ? null : (
        <form action={action} onSubmit={onSubmit} onFocusCapture={onFocusCapture} className="grid gap-3">
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
            {t('newsletterEmail')}
            <input className={field} type="email" name="email" required maxLength={254} autoComplete="email" />
          </label>

          <label className={`flex items-start gap-2 text-sm ${onBrand ? 'text-white' : 'text-fg-2'}`}>
            {/* The red band is the same in both themes, so its checkbox keeps the light (white) control in dark mode too */}
            <input type="checkbox" name="consent" required className={`mt-1 ${onBrand ? 'accent-white [color-scheme:light]' : 'accent-brand'}`} />
            <span>
              {t('newsletterConsent')}{' '}
              <Link href="/kvkk#bulten" className="underline">
                {t('newsletterPrivacy')}
              </Link>
            </span>
          </label>

          <button type="submit" aria-disabled={pending} className={`btn w-fit ${onBrand ? 'btn-white' : 'btn-brand'}`}>
            {pending ? t('subscribing') : t('subscribe')}
          </button>
        </form>
      )}
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${statusClass}`}>
        {pending ? '' : state.ok ? t('subscribed') : state.error ? t(`error.${state.error}`) : ''}
      </p>
    </div>
  )
}
