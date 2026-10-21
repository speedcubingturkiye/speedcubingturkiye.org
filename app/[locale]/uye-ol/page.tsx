import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { MembershipForm } from '@/components/MembershipForm'
import { WcaSignupForm } from '@/components/WcaSignupForm'
import { pageMeta } from '@/lib/metadata'
import { readToken } from '@/lib/newsletter-token'
import { splitName, wcaReady } from '@/lib/wca-link'
import { todayIstanbul } from '@/lib/wca/status'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Its forms wait for the members sheet's script (lib/membership-sheet.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [t, sp] = await Promise.all([getTranslations('membership'), searchParams])
  const meta = pageMeta(await getLocale(), '/uye-ol', { title: t('title'), description: t('lead') })
  // The WCA sign-up's token rides in the address until the page drops it: never indexed, never in a Referer
  return sp.w ? { ...meta, robots: { index: false }, referrer: 'no-referrer' } : meta
}

// Its own page, reached from the header's Üye ol button (not a Bilgi tab). Per request: the confirm link
// (uye-ol/onay/route.ts) lands here with ?durum=onaylandi or ?durum=gecersiz; the WCA login's return (api/wca/donus)
// with ?w=<token> for the sign-up form, or ?durum=wca-hata.
export default async function MembershipPage({ searchParams }: Props) {
  const [locale, t, account, sp] = await Promise.all([getLocale(), getTranslations('membership'), getTranslations('account'), searchParams])
  const durum = typeof sp.durum === 'string' ? sp.durum : ''
  const token = typeof sp.w === 'string' ? sp.w : ''
  const wca = token ? readToken('kaydol', token) : null
  const today = todayIstanbul()
  const notice = token && !wca ? t('wcaExpired') : durum === 'gecersiz' ? t('invalidLink') : durum === 'wca-hata' ? t('wcaFailed') : null
  const withWca = wcaReady()

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('title')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('lead')}</p>
        <p className="mt-2 text-sm text-fg-2">
          {t('note')} {account('already')}{' '}
          <Link href="/hesabim" className="underline">
            {account('title')}
          </Link>
        </p>
      </header>
      {durum === 'onaylandi' ? (
        <p role="status" className="text-lg font-semibold text-ok">
          {t('confirmed')}
        </p>
      ) : wca ? (
        <WcaSignupForm
          token={token}
          locale={locale}
          today={today}
          wcaId={wca.wcaId}
          defaults={{ ...splitName(wca.name ?? ''), email: wca.email, birthDate: wca.dob ?? '' }}
        />
      ) : (
        <>
          {notice ? (
            <p role="status" className="mb-6 font-semibold text-brand-ink">
              {notice}
            </p>
          ) : null}
          {withWca ? (
            // WCA ile kaydol (spec 2026-10-21): a plain form to the route that starts the WCA login
            <form action="/api/wca/kaydol" method="post" className="mb-10 grid max-w-xl gap-3 border border-line bg-bg-2 p-5">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-brand w-fit">
                {t('wcaSignup')}
              </button>
              <p className="text-sm text-fg-2">{t('wcaSignupNote')}</p>
            </form>
          ) : null}
          {withWca ? <h2 className="mb-6 text-2xl">{t('manualTitle')}</h2> : null}
          <MembershipForm locale={locale} today={today} />
        </>
      )}
    </section>
  )
}
