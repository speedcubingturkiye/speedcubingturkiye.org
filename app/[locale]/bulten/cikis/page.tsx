// app/[locale]/bulten/cikis/page.tsx: the unsubscribe link in every mailing (spec §6.4). A button, not an instant
// unsubscribe, so a mail scanner that opens the link cannot unsubscribe anyone; Gmail's own button uses the one-click
// POST at /api/bulten/cikis instead.
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { pageMeta } from '@/lib/metadata'
import { maskEmail } from '@/lib/newsletter'
import { readToken } from '@/lib/newsletter-token'
import { site } from '@/site.config'
import { UnsubscribeForm } from '@/components/UnsubscribeForm'

type Props = { searchParams: Promise<{ t?: string | string[] }> }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  const meta = pageMeta(await getLocale(), '/bulten/cikis', { title: t('unsubscribeTitle'), description: t('unsubscribeTitle') })
  return { ...meta, robots: { index: false } }
}

export default async function Page({ searchParams }: Props) {
  const t = await getTranslations('forms')
  const raw = (await searchParams).t
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? ''
  const data = readToken('cikis', token)
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('unsubscribeTitle')}</h1>
      {data ? (
        // The intro goes into the form: it shows only until the address is off the list.
        <UnsubscribeForm token={token} intro={t('unsubscribeText', { email: maskEmail(data.email) })} />
      ) : (
        <p className="mt-3 text-lg text-fg-2">
          {t('unsubscribeInvalid')}{' '}
          <a href={`mailto:${site.contactEmail}`} className="font-semibold text-fg underline">
            {site.contactEmail}
          </a>
        </p>
      )}
    </article>
  )
}
