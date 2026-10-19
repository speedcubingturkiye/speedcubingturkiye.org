import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ContactForm } from '@/components/ContactForm'
import { pageMeta } from '@/lib/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  return pageMeta(await getLocale(), '/gonullu-ol', { title: t('volunteerTitle'), description: t('volunteerDescription') })
}

export default async function VolunteerPage() {
  const locale = await getLocale()
  const t = await getTranslations('forms')
  // The other Bilgi pages' frame (MdxPage): the same width and spacing, so the title stays put across the tabs
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('volunteerTitle')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('volunteerDescription')}</p>
      </header>
      <ContactForm locale={locale} presetSubject="gonullu" />
    </div>
  )
}
