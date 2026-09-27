import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ContactForm } from '@/components/ContactForm'
import { pageMeta } from '@/lib/metadata'
import { site } from '@/site.config'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  return pageMeta(await getLocale(), '/iletisim', { title: t('contactTitle'), description: t('contactDescription') })
}

export default async function ContactPage() {
  const locale = await getLocale()
  const t = await getTranslations('forms')
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header>
        <h1>{t('contactTitle')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-fg-2">{t('contactDescription')}</p>
      </header>
      <p className="mt-2 text-fg-2">
        {t('contactEmailLabel')}:{' '}
        <a className="font-semibold text-fg underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
      </p>
      <div className="mt-10">
        <ContactForm locale={locale} />
      </div>
    </div>
  )
}
