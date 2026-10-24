import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { AccountEditor, type NewsletterStatus } from '@/components/AccountEditor'
import { AccountLinkForm } from '@/components/AccountLinkForm'
import { WcaButton } from '@/components/WcaLogo'
import { readAccountToken } from '@/lib/account'
import { pageMeta } from '@/lib/metadata'
import { getMember } from '@/lib/membership-sheet'
import { phoneCountries } from '@/lib/phone'
import { getSubscriber } from '@/lib/ses'
import { todayIstanbul } from '@/lib/wca/status'
import { wcaReady } from '@/lib/wca-link'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account')
  // One member's page at a time: never indexed, and its one-hour link never leaves in a Referer
  return { ...pageMeta(await getLocale(), '/hesabim', { title: t('title'), description: t('lead') }), robots: { index: false }, referrer: 'no-referrer' }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The page and its forms wait for the members sheet's script (lib/membership-sheet.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

// The outcome of an address change (hesabim/eposta, app/actions/confirm.ts), of a WCA link and of WCA ile giriş
// (api/wca/donus)
const NOTICES = {
  'eposta-degisti': 'emailChanged',
  'eposta-kullanimda': 'emailTaken',
  gecersiz: 'invalidLink',
  hata: 'loadFailed',
  'wca-baglandi': 'wcaLinked',
  'wca-yok': 'wcaNoId',
  'wca-kullanimda': 'wcaTaken',
  'wca-hata': 'wcaFailed',
  'wca-uye-yok': 'wcaNoMember',
} as const
const GOOD_NEWS = new Set(['emailChanged', 'wcaLinked'])

async function newsletterStatus(email: string): Promise<NewsletterStatus> {
  try {
    const subscriber = await getSubscriber(email)
    return subscriber ? subscriber.status : 'none'
  } catch {
    return 'unknown'
  }
}

/** Hesabım (spec 2026-10-21): ?t= is the one-hour link, from the mail or from WCA ile giriş (2026-10-22); without it,
 *  the WCA login and the form that mails a link. */
export default async function AccountPage({ searchParams }: Props) {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('account'), searchParams])
  const token = typeof sp.t === 'string' ? sp.t : ''
  const data = token ? readAccountToken(token) : null
  const member = data ? await getMember(data.email) : null
  const durum = typeof sp.durum === 'string' && sp.durum in NOTICES ? NOTICES[sp.durum as keyof typeof NOTICES] : null
  const notice = token && !data ? t('expired') : data && member === null ? t('noMember') : member === 'error' ? t('loadFailed') : durum ? t(durum) : null
  const withWca = wcaReady()

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('title')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('lead')}</p>
        {member && member !== 'error' && member.memberNo ? <p className="mt-2 text-sm text-fg-2">{t('memberNo', { no: member.memberNo })}</p> : null}
      </header>
      {/* Above both views: a WCA link comes back to the editor with its outcome */}
      {notice ? (
        <p role="status" className={`mb-6 font-semibold ${durum && GOOD_NEWS.has(durum) ? 'text-ok' : 'text-brand-ink'}`}>
          {notice}
        </p>
      ) : null}
      {data && member && member !== 'error' ? (
        <AccountEditor
          token={token}
          member={member}
          newsletter={await newsletterStatus(data.email)}
          today={todayIstanbul()}
          countries={phoneCountries(locale)}
          wca={withWca}
        />
      ) : (
        <>
          {withWca ? (
            // WCA ile giriş (2026-10-22): a plain form to the route that starts the WCA login, as on Üye ol
            <form action="/api/wca/giris" method="post" className="mb-10 max-w-xl">
              <input type="hidden" name="locale" value={locale} />
              <WcaButton wide>{t('wcaLogin')}</WcaButton>
            </form>
          ) : null}
          {withWca ? <h2 className="mb-6 text-2xl">{t('mailTitle')}</h2> : null}
          <AccountLinkForm locale={locale} />
        </>
      )}
    </section>
  )
}
