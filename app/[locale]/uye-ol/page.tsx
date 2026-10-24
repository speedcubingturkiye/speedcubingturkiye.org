import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Done, MemberNextSteps } from '@/components/Done'
import { MembershipForm } from '@/components/MembershipForm'
import { WcaButton } from '@/components/WcaLogo'
import { WcaSignupForm } from '@/components/WcaSignupForm'
import { pageMeta } from '@/lib/metadata'
import { readToken } from '@/lib/newsletter-token'
import { phoneCountries } from '@/lib/phone'
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

// A choice of the "WCA yarışmasında yarıştın mı?" question: an unchecked radio until the visitor picks
const CHOICE =
  't-label flex items-center justify-center pt-[13px] pb-[11px] pl-[0.08em] text-fg-2 hover:text-fg has-[:checked]:bg-fg has-[:checked]:text-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand'

/**
 * Üye ol's first question (2026-10-24, as cubing.com asks): someone who has competed signs up with the WCA alone, so
 * their WCA ID comes verified; anyone else fills in the form. The page's `group` shows the chosen way through CSS
 * (:has), so it works without JS too. `initial`: a choice already made, for a notice that sends the visitor back.
 */
function CompetedQuestion({ legend, yes, no, initial }: { legend: string; yes: string; no: string; initial: 'wca' | 'form' | null }) {
  return (
    <fieldset className="mb-8 max-w-xl">
      <legend className="mb-3 text-lg font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 border border-line">
        <label className={CHOICE}>
          <input type="radio" name="yol" id="yol-wca" defaultChecked={initial === 'wca'} className="sr-only" />
          {yes}
        </label>
        <label className={`${CHOICE} border-l border-line`}>
          <input type="radio" name="yol" id="yol-form" defaultChecked={initial === 'form'} className="sr-only" />
          {no}
        </label>
      </div>
    </fieldset>
  )
}

// Its own page, reached from the header's Üye ol button (not a Bilgi tab). Per request: the confirm page's button
// (uye-ol/onay, app/actions/confirm.ts) lands here with ?durum=onaylandi, onaylandi-wca (begun without the WCA ID another
// member has) or gecersiz; the WCA login's return (api/wca/donus) with ?w=<token> for the sign-up form, or
// ?durum=wca-hata.
export default async function MembershipPage({ searchParams }: Props) {
  const [locale, t, account, sp] = await Promise.all([getLocale(), getTranslations('membership'), getTranslations('account'), searchParams])
  const durum = typeof sp.durum === 'string' ? sp.durum : ''
  const token = typeof sp.w === 'string' ? sp.w : ''
  const wca = token ? readToken('kaydol', token) : null
  const today = todayIstanbul()
  const notice = token && !wca ? t('wcaExpired') : durum === 'gecersiz' ? t('invalidLink') : durum === 'wca-hata' ? t('wcaFailed') : null
  const confirmed = durum === 'onaylandi' || durum === 'onaylandi-wca'
  const withWca = wcaReady()
  const countries = phoneCountries(locale)

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('title')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('lead')}</p>
        {confirmed ? null : (
          <p className="mt-2 text-sm text-fg-2">
            {t('note')} {account('already')}{' '}
            <Link href="/hesabim" className="underline">
              {account('title')}
            </Link>
          </p>
        )}
      </header>
      {confirmed ? (
        <Done message={t(durum === 'onaylandi' ? 'confirmed' : 'confirmedWca')}>
          <MemberNextSteps account={t('doneAccount')} calendar={t('doneCalendar')} />
        </Done>
      ) : wca ? (
        <WcaSignupForm
          token={token}
          locale={locale}
          today={today}
          countries={countries}
          wcaId={wca.wcaId}
          defaults={{ ...splitName(wca.name ?? ''), email: wca.email, birthDate: wca.dob ?? '' }}
        />
      ) : (
        // The notice and the question go with the form: once it is sent, the result stands alone. "Evet" shows the WCA
        // sign-up, "Hayır" the form; a notice of a WCA failure picks "Evet" again, a dead confirm link "Hayır".
        <div className="group">
          <MembershipForm
            locale={locale}
            today={today}
            countries={countries}
            waitsForChoice={withWca}
            intro={
              <>
                {notice ? (
                  <p role="status" className="mb-6 font-semibold text-brand-ink">
                    {notice}
                  </p>
                ) : null}
                {withWca ? (
                  <>
                    <CompetedQuestion
                      legend={t('competedQuestion')}
                      yes={t('competedYes')}
                      no={t('competedNo')}
                      initial={notice === null ? null : durum === 'gecersiz' ? 'form' : 'wca'}
                    />
                    {/* WCA ile kaydol (spec 2026-10-21): a plain form to the route that starts the WCA login */}
                    <form action="/api/wca/kaydol" method="post" className="hidden max-w-xl group-has-[#yol-wca:checked]:block">
                      <input type="hidden" name="locale" value={locale} />
                      <WcaButton wide>{t('wcaSignup')}</WcaButton>
                    </form>
                  </>
                ) : null}
              </>
            }
          />
        </div>
      )}
    </section>
  )
}
