'use client'

import { useEffect, type ReactNode, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { changeEmail, leave, newsletter, saveAccount } from '@/app/actions/account'
import { check, field, MemberFields } from '@/components/MemberFields'
import { useFormSubmit } from '@/components/useFormStartTime'
import type { AccountState } from '@/app/actions/types'
import type { MemberRecord } from '@/lib/membership-sheet'

export type NewsletterStatus = 'confirmed' | 'pending' | 'none' | 'unknown'

const initial: AccountState = { ok: false }
const failed: AccountState = { ok: false, error: 'send_failed' } // the action never answered (rate limit, network)
const done = (s: AccountState) => s.ok

/** A section's result; an expired link offers a new one. Empty while pending, so a repeated error is heard again. */
function Status({ state, pending, ok, statusRef }: { state: AccountState; pending: boolean; ok: string; statusRef: RefObject<HTMLParagraphElement | null> }) {
  const t = useTranslations('account')
  return (
    <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm font-semibold ${state.ok ? 'text-ok' : 'text-brand-ink'}`}>
      {pending ? '' : state.ok ? ok : state.error ? t(`error.${state.error}`) : ''}
      {!pending && state.error === 'expired' ? (
        <>
          {' '}
          <Link href="/hesabim" className="underline">
            {t('requestNew')}
          </Link>
        </>
      ) : null}
    </p>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid max-w-xl gap-4 border-t border-line pt-8">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      {children}
    </section>
  )
}

// Every form carries the page's one-hour token: the page sets no cookie
const TokenField = ({ token }: { token: string }) => <input type="hidden" name="t" value={token} />

function DetailsSection({ token, member, today }: { token: string; member: MemberRecord; today: string }) {
  const t = useTranslations('account')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(saveAccount, initial, failed, done)
  return (
    <Section id="hesap-bilgiler" title={t('details')}>
      <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
        <TokenField token={token} />
        <MemberFields today={today} defaults={member} error={state.error} />
        {/* aria-disabled, not disabled: a disabled button drops keyboard focus to <body> while the action runs */}
        <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
          {pending ? t('saving') : t('save')}
        </button>
      </form>
      <Status state={state} pending={pending} ok={t('saved')} statusRef={statusRef} />
    </Section>
  )
}

function AddressSection({ token, email }: { token: string; email: string }) {
  const t = useTranslations('account')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(changeEmail, initial, failed, done)
  return (
    <Section id="hesap-eposta" title={t('emailTitle')}>
      <p className="text-sm text-fg-2">{t('currentEmail', { email })}</p>
      {state.ok ? null : (
        <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
          <TokenField token={token} />
          <label className="block text-sm font-semibold">
            {t('newEmail')}
            <input className={field} name="newEmail" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <p className="text-sm text-fg-2">{t('newsletterStays')}</p>
          <button type="submit" aria-disabled={pending} className="btn btn-brand w-fit">
            {pending ? t('sending') : t('sendConfirm')}
          </button>
        </form>
      )}
      <Status state={state} pending={pending} ok={t('confirmSent')} statusRef={statusRef} />
    </Section>
  )
}

function NewsletterSection({ token, status }: { token: string; status: NewsletterStatus }) {
  const t = useTranslations('account')
  const forms = useTranslations('forms')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(newsletter, initial, failed, done)
  const subscribed = status === 'confirmed'
  return (
    <Section id="hesap-bulten" title={t('newsletterTitle')}>
      <p className="text-sm text-fg-2">{{ confirmed: t('subscribed'), pending: t('pending'), none: t('notSubscribed'), unknown: t('newsletterUnknown') }[status]}</p>
      {status === 'unknown' || state.ok ? null : (
        <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
          <TokenField token={token} />
          <input type="hidden" name="op" value={subscribed ? 'unsubscribe' : 'subscribe'} />
          {subscribed ? null : (
            // The newsletter form's consent word for word: a sign-up from here is the same explicit consent
            <label className={check}>
              <input type="checkbox" name="consent" required className="mt-1 accent-brand" />
              <span>
                {forms('newsletterConsent')}{' '}
                <Link href="/kvkk#bulten" className="underline">
                  {forms('newsletterPrivacy')}
                </Link>
              </span>
            </label>
          )}
          <button type="submit" aria-disabled={pending} className={`btn w-fit ${subscribed ? 'btn-outline' : 'btn-brand'}`}>
            {subscribed ? t('unsubscribe') : t('subscribe')}
          </button>
        </form>
      )}
      <Status state={state} pending={pending} ok={subscribed ? t('unsubscribed') : t('subscribeSent')} statusRef={statusRef} />
    </Section>
  )
}

/**
 * Hesabım (spec 2026-10-21), opened by the one-hour link: each section is its own form carrying the link's token, so
 * the page sets no cookie. The token leaves the address bar on load; the page's Referrer-Policy keeps it out of links.
 * Leaving is held here, so the whole page gives way to the goodbye.
 */
export function AccountEditor({ token, member, newsletter: status, today }: { token: string; member: MemberRecord; newsletter: NewsletterStatus; today: string }) {
  const t = useTranslations('account')
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(leave, initial, failed, done)

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  if (state.ok) {
    return (
      <p ref={statusRef} tabIndex={-1} role="status" className="text-lg font-semibold text-ok">
        {t('left')}
      </p>
    )
  }

  return (
    <div className="grid gap-10">
      <DetailsSection token={token} member={member} today={today} />
      <AddressSection token={token} email={member.email} />
      <NewsletterSection token={token} status={status} />
      <Section id="hesap-ayril" title={t('leaveTitle')}>
        <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
          <TokenField token={token} />
          <label className={check}>
            <input type="checkbox" name="confirm" required className="mt-1 accent-brand" />
            <span>{t('leaveConfirm')}</span>
          </label>
          {status === 'confirmed' ? (
            <label className={check}>
              <input type="checkbox" name="newsletter" className="mt-1 accent-brand" />
              <span>{t('leaveNewsletter')}</span>
            </label>
          ) : null}
          <button type="submit" aria-disabled={pending} className="btn btn-outline w-fit">
            {t('leave')}
          </button>
        </form>
        <Status state={state} pending={pending} ok={t('left')} statusRef={statusRef} />
      </Section>
    </div>
  )
}
