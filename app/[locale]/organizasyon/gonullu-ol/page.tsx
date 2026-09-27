import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ContactForm } from '@/components/ContactForm'
import { SectionNav } from '@/components/SectionNav'
import { pageMeta } from '@/lib/metadata'
import { organizationSectionNav } from '@/lib/section-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  return pageMeta(await getLocale(), '/organizasyon/gonullu-ol', { title: t('volunteerTitle'), description: t('volunteerDescription') })
}

export default async function VolunteerPage() {
  const locale = await getLocale()
  const t = await getTranslations('forms')
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1>{t('volunteerTitle')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-fg-2">{t('volunteerDescription')}</p>
      </header>
      <SectionNav items={await organizationSectionNav()} />
      <div className="mt-10">
        <ContactForm locale={locale} presetSubject="gonullu" />
      </div>
    </div>
  )
}
