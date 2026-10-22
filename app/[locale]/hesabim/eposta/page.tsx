// app/[locale]/hesabim/eposta/page.tsx: the link mailed to a new address (spec 2026-10-21). Since 2026-10-22 the link
// opens this page and its button moves the membership (app/actions/confirm.ts), so a mail scanner that opens the link
// moves nothing. A link that ran out goes straight back to Hesabım with ?durum=gecersiz.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { confirmEmailChangeLink } from '@/app/actions/confirm'
import { ConfirmForm } from '@/components/ConfirmForm'
import { pageMeta } from '@/lib/metadata'
import { maskEmail } from '@/lib/newsletter'
import { readToken } from '@/lib/newsletter-token'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The button waits for the members sheet's script (lib/membership-sheet.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('confirm')
  const meta = pageMeta(await getLocale(), '/hesabim/eposta', { title: t('emailTitle'), description: t('emailTitle') })
  // The token rides in the address: never indexed, never in a Referer
  return { ...meta, robots: { index: false }, referrer: 'no-referrer' }
}

export default async function ConfirmEmailChangePage({ searchParams }: Props) {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('confirm'), searchParams])
  const token = (Array.isArray(sp.t) ? sp.t[0] : sp.t) ?? ''
  const data = readToken('eposta', token)
  if (!data?.newEmail) redirect(`${locale === 'en' ? '/en' : ''}/hesabim?durum=gecersiz`)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('emailTitle')}</h1>
      <p className="mt-3 text-lg text-fg-2">{t('emailText', { email: maskEmail(data.newEmail) })}</p>
      <ConfirmForm action={confirmEmailChangeLink} fields={{ t: token, locale }} label={t('emailButton')} pendingLabel={t('pending')} />
    </section>
  )
}
