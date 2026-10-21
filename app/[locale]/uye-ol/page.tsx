import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { MembershipForm } from '@/components/MembershipForm'
import { pageMeta } from '@/lib/metadata'
import { todayIstanbul } from '@/lib/wca/status'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('membership')
  return pageMeta(await getLocale(), '/uye-ol', { title: t('title'), description: t('lead') })
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Its own page, reached from the header's Üye ol button (not a Bilgi tab). Per request: the confirm link
// (uye-ol/onay/route.ts) lands here with ?durum=onaylandi or ?durum=gecersiz.
export default async function MembershipPage({ searchParams }: Props) {
  const [locale, t, account, { durum }] = await Promise.all([getLocale(), getTranslations('membership'), getTranslations('account'), searchParams])
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
      ) : (
        <>
          {durum === 'gecersiz' ? (
            <p role="status" className="mb-6 font-semibold text-brand-ink">
              {t('invalidLink')}
            </p>
          ) : null}
          <MembershipForm locale={locale} today={todayIstanbul()} />
        </>
      )}
    </section>
  )
}
