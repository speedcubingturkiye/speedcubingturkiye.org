import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { MembershipForm } from '@/components/MembershipForm'
import { pageMeta } from '@/lib/metadata'
import { todayIstanbul } from '@/lib/wca/status'
import { site } from '@/site.config'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('membership')
  return pageMeta(await getLocale(), '/uye-ol', { title: t('title'), description: t('lead') })
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Per request: the confirm link (uye-ol/onay/route.ts) lands here with ?durum=onaylandi or ?durum=gecersiz. The section
// layout draws the title, the lead and the note (SectionHeader).
export default async function MembershipPage({ searchParams }: Props) {
  const [locale, t, { durum }] = await Promise.all([getLocale(), getTranslations('membership'), searchParams])
  if (durum === 'onaylandi') {
    return (
      <p role="status" className="text-lg font-semibold text-ok">
        {t('confirmed')}
      </p>
    )
  }
  return (
    <>
      {durum === 'gecersiz' ? (
        <p role="status" className="mb-6 font-semibold text-brand-ink">
          {t('invalidLink')}
        </p>
      ) : null}
      <div className="mb-8 grid max-w-xl gap-3 text-fg-2">
        <p>{t('intro')}</p>
        <p>{t('leave', { email: site.contactEmail })}</p>
      </div>
      <MembershipForm locale={locale} today={todayIstanbul()} />
    </>
  )
}
