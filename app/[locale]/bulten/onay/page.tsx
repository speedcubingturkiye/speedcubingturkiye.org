// app/[locale]/bulten/onay/page.tsx: the confirm link in the double opt-in mail (spec §6.3). Since 2026-10-22 the link
// opens this page and its button confirms (app/actions/confirm.ts), so a mail scanner that opens the link subscribes
// no one. A link that no longer works goes straight to /bulten/gecersiz.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { confirmNewsletterLink } from '@/app/actions/confirm'
import { ConfirmForm } from '@/components/ConfirmForm'
import { pageMeta } from '@/lib/metadata'
import { maskEmail } from '@/lib/newsletter'
import { readToken } from '@/lib/newsletter-token'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('confirm')
  const meta = pageMeta(await getLocale(), '/bulten/onay', { title: t('newsletterTitle'), description: t('newsletterTitle') })
  // The token rides in the address: never indexed, never in a Referer
  return { ...meta, robots: { index: false }, referrer: 'no-referrer' }
}

export default async function ConfirmNewsletterPage({ searchParams }: Props) {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('confirm'), searchParams])
  const token = (Array.isArray(sp.t) ? sp.t[0] : sp.t) ?? ''
  const data = readToken('onay', token)
  if (!data) redirect(`${locale === 'en' ? '/en' : ''}/bulten/gecersiz`)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('newsletterTitle')}</h1>
      <p className="mt-3 text-lg text-fg-2">{t('newsletterText', { email: maskEmail(data.email) })}</p>
      <ConfirmForm action={confirmNewsletterLink} fields={{ t: token, locale }} label={t('newsletterButton')} pendingLabel={t('pending')} />
    </section>
  )
}
