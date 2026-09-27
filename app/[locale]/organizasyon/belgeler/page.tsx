import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { site } from '@/site.config'
import { pageMeta } from '@/lib/metadata'
import { organizationSectionNav } from '@/lib/section-nav'
import { formatDate } from '@/lib/wca/format'
import { SectionNav } from '@/components/SectionNav'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return pageMeta(locale, '/organizasyon/belgeler', { title: t('documentsTitle'), description: t('documentsDescription') })
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const docs = [...site.documents].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('documentsTitle')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('documentsDescription')}</p>
      </header>
      <SectionNav items={await organizationSectionNav()} />
      {docs.length === 0 ? (
        <p className="mt-6 text-fg-2">{t('documentsEmpty')}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {docs.map((doc) => (
            <li key={doc.file} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <a href={doc.file} className="font-semibold text-brand-ink underline underline-offset-2" download>
                {doc.title[locale]}
              </a>
              <time dateTime={doc.date} className="text-sm text-fg-2">
                {formatDate(doc.date, locale)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
