'use client'

import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { changeEmail, confirmWcaLink, leave, newsletter, ranking, saveAccount, unlinkWca } from '@/app/actions/account'
import { ConfirmButton } from '@/components/ConfirmForm'
import { check, field, MemberFields } from '@/components/MemberFields'
import { useFormSubmit } from '@/components/useFormStartTime'
import type { AccountState } from '@/app/actions/types'
import { ABROAD, ageOn } from '@/lib/membership-rules'
import type { MemberRecord } from '@/lib/membership-sheet'
import { formatDate } from '@/lib/wca/format'

export type NewsletterStatus = 'confirmed' | 'pending' | 'none' | 'unknown'
/** A WCA account back from the WCA login, waiting for "Bağla" (2026-10-22): its 10-minute token and what to show */
type PendingWca = { token: string; wcaId: string; name: string }

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

/** İl sıralaması (spec 2026-10-21, Parça 2): in with explicit consent (and the guardian box under 18), out at once. */
function RankingBox({ token, member, today }: { token: string; member: MemberRecord; today: string }) {
  const t = useTranslations('account')
  const locale = useLocale() as Locale
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(ranking, initial, failed, done)
  const minor = ageOn(member.birthDate, today) < 18
  return (
    <div className="grid gap-4">
      <h3 className="text-lg">{t('rankingTitle')}</h3>
      {state.ok ? null : (
        <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
          <TokenField token={token} />
          <input type="hidden" name="op" value={member.ranking ? 'leave' : 'join'} />
          {member.ranking ? (
            // Abroad is a list of its own since 2026-10-22
            <p className="text-sm text-fg-2">{member.city === ABROAD ? t('rankingInAbroad') : t('rankingIn', { city: member.city })}</p>
          ) : (
            <>
              <p className="text-sm text-fg-2">{t('rankingIntro')}</p>
              <label className={check}>
                <input type="checkbox" name="consent" required className="mt-1 accent-brand" />
                <span>
                  {t('rankingConsent')}{' '}
                  <Link href="/kvkk#il-siralamasi" className="underline">
                    {t('rankingPrivacy')}
                  </Link>
                </span>
              </label>
              {minor ? (
                <label className={check}>
                  <input type="checkbox" name="guardian" required className="mt-1 accent-brand" />
                  <span>{t('rankingGuardian')}</span>
                </label>
              ) : null}
            </>
          )}
          <button type="submit" aria-disabled={pending} className={`btn w-fit ${member.ranking ? 'btn-outline' : 'btn-brand'}`}>
            {member.ranking ? t('rankingLeave') : t('rankingJoin')}
          </button>
        </form>
      )}
      {member.cityLockedUntil ? (
        <p className="text-sm text-fg-2">
          {t.rich('cityLocked', {
            date: formatDate(member.cityLockedUntil, locale),
            contact: (chunks) => (
              <Link href="/iletisim" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : null}
      <Status state={state} pending={pending} ok={member.ranking ? t('rankingLeft') : t('rankingJoined')} statusRef={statusRef} />
    </div>
  )
}

/** WCA hesabı: linking goes out to the WCA login through /api/wca/baglan and comes back as `pendingWca`, linked only
 *  with "Bağla" (2026-10-22); a linked account can be unlinked here. */
function WcaSection({ token, member, today, pendingWca }: { token: string; member: MemberRecord; today: string; pendingWca: PendingWca | null }) {
  const t = useTranslations('account')
  const locale = useLocale()
  const { state, formAction, pending, onSubmit, statusRef } = useFormSubmit(unlinkWca, initial, failed, done)
  const [dismissed, setDismissed] = useState(false)
  return (
    <Section id="hesap-wca" title={t('wcaTitle')}>
      {member.wcaVerified ? (
        <>
          {state.ok ? null : (
            <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
              <TokenField token={token} />
              <p className="text-sm text-fg-2">{t('wcaLinkedAs', { wcaId: member.wcaId })}</p>
              <button type="submit" aria-disabled={pending} className="btn btn-outline w-fit">
                {t('wcaUnlink')}
              </button>
            </form>
          )}
          <Status state={state} pending={pending} ok={t('wcaUnlinked')} statusRef={statusRef} />
          {state.ok ? null : <RankingBox token={token} member={member} today={today} />}
        </>
      ) : pendingWca && !dismissed ? (
        <form action={confirmWcaLink} className="grid gap-4">
          <TokenField token={token} />
          <input type="hidden" name="w" value={pendingWca.token} />
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm text-fg-2">{t('wcaConfirmText', { wcaId: pendingWca.wcaId, name: pendingWca.name })}</p>
          <div className="flex flex-wrap gap-3">
            <ConfirmButton label={t('wcaConfirm')} pendingLabel={t('wcaLinking')} />
            <button type="button" onClick={() => setDismissed(true)} className="btn btn-outline">
              {t('wcaCancel')}
            </button>
          </div>
        </form>
      ) : (
        // A plain form to the route that starts the WCA login: no JS needed, and the token stays out of the address
        <form action="/api/wca/baglan" method="post" className="grid gap-4">
          <TokenField token={token} />
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm text-fg-2">{t('wcaIntro')}</p>
          <button type="submit" className="btn btn-brand w-fit">
            {t('wcaLink')}
          </button>
        </form>
      )}
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
export function AccountEditor({
  token,
  member,
  newsletter: status,
  today,
  wca,
  pendingWca,
}: {
  token: string
  member: MemberRecord
  newsletter: NewsletterStatus
  today: string
  /** whether the WCA link is set up (lib/wca-link.ts wcaReady) */
  wca: boolean
  pendingWca: PendingWca | null
}) {
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
      {wca ? <WcaSection token={token} member={member} today={today} pendingWca={pendingWca} /> : null}
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
