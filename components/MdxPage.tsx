import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getPage } from '@/lib/content'
import { formatDate } from '@/lib/wca/format'
import { Prose } from '@/components/Prose'

export async function MdxPage({
  locale,
  slug,
  sectionNav,
  children,
}: {
  locale: Locale
  slug: string
  /** Section tabs, rendered under the title inside the page container (spec §4.4). */
  sectionNav?: ReactNode
  children?: ReactNode
}) {
  const page = await getPage(locale, slug)
  if (!page) notFound()
  const t = await getTranslations('common')
  const { title, description, updated } = page.frontmatter
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{title}</h1>
        {description && <p className="mt-3 text-lg text-fg-2">{description}</p>}
        {updated && <p className="mt-2 text-sm text-fg-2">{t('lastUpdated', { date: formatDate(updated, locale) })}</p>}
      </header>
      {sectionNav && <div className="mb-8">{sectionNav}</div>}
      <Prose>{page.content}</Prose>
      {children}
    </article>
  )
}
