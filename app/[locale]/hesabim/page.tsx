import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { AccountEditor, type NewsletterStatus } from '@/components/AccountEditor'
import { AccountLinkForm } from '@/components/AccountLinkForm'
import { readAccountToken } from '@/lib/account'
import { pageMeta } from '@/lib/metadata'
import { getMember } from '@/lib/membership-sheet'
import { getSubscriber } from '@/lib/ses'
import { todayIstanbul } from '@/lib/wca/status'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account')
  // One member's page at a time: never indexed, and its one-hour link never leaves in a Referer
  return { ...pageMeta(await getLocale(), '/hesabim', { title: t('title'), description: t('lead') }), robots: { index: false }, referrer: 'no-referrer' }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The outcome of an address change (hesabim/eposta/route.ts)
const NOTICES = { 'eposta-degisti': 'emailChanged', 'eposta-kullanimda': 'emailTaken', gecersiz: 'invalidLink', hata: 'loadFailed' } as const

async function newsletterStatus(email: string): Promise<NewsletterStatus> {
  try {
    const subscriber = await getSubscriber(email)
    return subscriber ? subscriber.status : 'none'
  } catch {
    return 'unknown'
  }
}

/** Hesabım (spec 2026-10-21): ?t= is the one-hour link from the mail; without it, the form that mails one. */
export default async function AccountPage({ searchParams }: Props) {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('account'), searchParams])
  const token = typeof sp.t === 'string' ? sp.t : ''
  const data = token ? readAccountToken(token) : null
  const member = data ? await getMember(data.email) : null
  const durum = typeof sp.durum === 'string' && sp.durum in NOTICES ? NOTICES[sp.durum as keyof typeof NOTICES] : null
  const notice = token && !data ? t('expired') : data && member === null ? t('noMember') : member === 'error' ? t('loadFailed') : durum ? t(durum) : null

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('title')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('lead')}</p>
      </header>
      {data && member && member !== 'error' ? (
        <AccountEditor token={token} member={member} newsletter={await newsletterStatus(data.email)} today={todayIstanbul()} />
      ) : (
        <>
          {notice ? (
            <p role="status" className={`mb-6 font-semibold ${durum === 'emailChanged' ? 'text-ok' : 'text-brand-ink'}`}>
              {notice}
            </p>
          ) : null}
          <AccountLinkForm locale={locale} />
        </>
      )}
    </section>
  )
}
