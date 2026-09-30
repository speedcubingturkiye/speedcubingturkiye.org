// components/UnsubscribeForm.tsx
'use client'

import { useTranslations } from 'next-intl'
import { unsubscribeAction, type UnsubscribeState } from '@/app/actions/unsubscribe'
import { useFormSubmit } from '@/components/useFormStartTime'

const initial: UnsubscribeState = { status: 'idle' }
const failed: UnsubscribeState = { status: 'failed' } // the action never answered (rate limit, network)

/** One button; submit, pending guard and focus on success as in NewsletterForm (useFormSubmit). `intro` is the page's
 *  already translated "press the button" text: it goes away once the address is off the list. */
export function UnsubscribeForm({ token, intro }: { token: string; intro: string }) {
  const t = useTranslations('forms')
  const { state, formAction, pending, done, onSubmit, statusRef } = useFormSubmit(unsubscribeAction, initial, failed, (s) => s.status === 'done')
  return (
    <>
      {done ? null : <p className="mt-3 text-lg text-fg-2">{intro}</p>}
      <div className="mt-6 grid gap-3">
        {done ? null : (
          <form action={formAction} onSubmit={onSubmit}>
            <input type="hidden" name="t" value={token} />
            <button type="submit" aria-disabled={pending} className="btn btn-brand">
              {pending ? t('unsubscribing') : t('unsubscribeButton')}
            </button>
          </form>
        )}
        <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${done ? 'text-ok' : 'text-brand-ink'}`}>
          {pending ? '' : done ? t('unsubscribed') : state.status === 'failed' ? t('unsubscribeFailed') : ''}
        </p>
      </div>
    </>
  )
}
