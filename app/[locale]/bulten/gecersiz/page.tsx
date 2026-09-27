// app/[locale]/bulten/gecersiz/page.tsx: where a confirm link that no longer works lands (spec §6.3). The newsletter
// strip above the footer is right below, so the reader can sign up again on the spot.
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { pageMeta } from '@/lib/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  const meta = pageMeta(await getLocale(), '/bulten/gecersiz', { title: t('confirmInvalidTitle'), description: t('confirmInvalidText') })
  return { ...meta, robots: { index: false } }
}

export default async function Page() {
  const t = await getTranslations('forms')
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{t('confirmInvalidTitle')}</h1>
      <p className="mt-3 text-lg text-fg-2">{t('confirmInvalidText')}</p>
    </article>
  )
}
