// app/[locale]/uye-ol/onay/page.tsx: the confirm link in the membership mail (spec 2026-10-19 §3). Since 2026-10-22 the
// link opens this page and its button confirms (app/actions/confirm.ts), so a mail scanner that opens the link confirms
// nothing. A link whose code fails its signature goes straight back to Üye ol with ?durum=gecersiz.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { confirmMembershipLink } from '@/app/actions/confirm'
import { ConfirmForm } from '@/components/ConfirmForm'
import { confirmCode } from '@/lib/membership'
import { pageMeta } from '@/lib/metadata'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The button waits for the members sheet's script (lib/membership-sheet.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('confirm')
  const meta = pageMeta(await getLocale(), '/uye-ol/onay', { title: t('membershipTitle'), description: t('membershipText') })
  // The code rides in the address: never indexed, never in a Referer
  return { ...meta, robots: { index: false }, referrer: 'no-referrer' }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function ConfirmMembershipPage({ searchParams }: Props) {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('confirm'), searchParams])
  const code = one(sp.t)
  const newsletter = one(sp.b)
  if (!confirmCode(code)) redirect(`${locale === 'en' ? '/en' : ''}/uye-ol?durum=gecersiz`)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('membershipTitle')}</h1>
      <p className="mt-3 text-lg text-fg-2">{t('membershipText')}</p>
      {newsletter ? <p className="mt-2 text-fg-2">{t('membershipNewsletter')}</p> : null}
      <ConfirmForm
        action={confirmMembershipLink}
        fields={{ t: code, ...(newsletter ? { b: newsletter } : {}), locale }}
        label={t('membershipButton')}
        pendingLabel={t('pending')}
      />
    </section>
  )
}
