import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ContactForm } from '@/components/ContactForm'
import { pageMeta } from '@/lib/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms')
  return pageMeta(await getLocale(), '/gonullu-ol', { title: t('volunteerTitle'), description: t('volunteerDescription') })
}

// The section layout draws the title and the lead (SectionHeader)
export default async function VolunteerPage() {
  return <ContactForm locale={await getLocale()} presetSubject="gonullu" />
}
