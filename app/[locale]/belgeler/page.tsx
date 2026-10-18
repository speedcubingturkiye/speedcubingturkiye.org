import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { listNews } from '@/lib/content'
import type { DocSection } from '@/lib/content-rules'
import { documentSections, listDocuments, type SiteDocument } from '@/lib/documents'
import { pageMeta } from '@/lib/metadata'
import { organizationSectionNav } from '@/lib/section-nav'
import { formatDate } from '@/lib/wca/format'
import { SectionNav } from '@/components/SectionNav'

// Section anchors, linked from other pages (for example /guvenli-ortam links #politikalar).
const ANCHOR: Record<DocSection, string> = { tuzuk: 'tuzuk', yonetmelik: 'yonetmelikler', politika: 'politikalar', mali: 'mali-raporlar' }
const ROW = 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3'
const LINK = 'font-semibold text-brand-ink underline underline-offset-2'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return pageMeta(locale, '/belgeler', { title: t('documentsTitle'), description: t('documentsDescription') })
}

/**
 * One document. The title opens the PDF in the page's language, or the Turkish one when there is no English file
 * (marked "TR"). The small label opens the other language's PDF when both exist.
 */
function DocumentRow({ doc, locale, version, otherPdf, turkishOnly }: { doc: SiteDocument; locale: Locale; version: string; otherPdf: string; turkishOnly: string }) {
  const own = doc.file[locale]
  const other: Locale = locale === 'tr' ? 'en' : 'tr'
  const otherFile = own ? doc.file[other] : null
  return (
    <li className={ROW}>
      <span>
        {doc.code && <span className="mr-2 text-sm text-fg-2">{doc.code}</span>}
        <a href={own ?? doc.file.tr} hrefLang={own ? locale : 'tr'} type="application/pdf" className={LINK}>
          {doc.title[locale]}
          <span className="sr-only">, PDF</span>
        </a>
        {!own && (
          <span className="t-label ml-2 border border-line pt-[3px] pr-2 pb-px pl-[calc(0.5rem+0.08em)] text-fg-2">
            <span aria-hidden="true">TR</span>
            <span className="sr-only normal-case">{turkishOnly}</span>
          </span>
        )}
      </span>
      <span className="flex items-baseline gap-3 text-sm text-fg-2">
        {version && <span>{version}</span>}
        <time dateTime={doc.date}>{formatDate(doc.date, locale)}</time>
        {otherFile && (
          <a
            href={otherFile}
            hrefLang={other}
            type="application/pdf"
            className="t-label border border-line pt-[3px] pr-2 pb-px pl-[calc(0.5rem+0.08em)] text-brand-ink hover:border-brand-ink"
          >
            <span aria-hidden="true">{other.toUpperCase()}</span>
            <span className="sr-only normal-case">{otherPdf}</span>
          </a>
        )}
      </span>
    </li>
  )
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const [docs, notices] = await Promise.all([listDocuments(), listNews(locale, { category: 'ilan' })])
  const sections = documentSections(docs, locale)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('documentsTitle')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('documentsDescription')}</p>
        <p className="mt-2 text-sm text-fg-2">{t('documentsLanguageNote')}</p>
      </header>
      <SectionNav items={await organizationSectionNav()} />
      {sections.length === 0 && notices.length === 0 && <p className="mt-6 text-fg-2">{t('documentsEmpty')}</p>}
      {sections.map(({ section, docs }) => (
        <section key={section} id={ANCHOR[section]} className="mt-10">
          <h2>{t(`documentsSections.${section}`)}</h2>
          <ul className="mt-3 divide-y divide-line">
            {docs.map((doc) => (
              <DocumentRow
                key={doc.slug}
                doc={doc}
                locale={locale}
                version={doc.version ? t('documentsVersion', { version: doc.version }) : ''}
                otherPdf={t('documentsOtherPdf')}
                turkishOnly={t('documentsTurkishOnly')}
              />
            ))}
          </ul>
        </section>
      ))}
      {notices.length > 0 && (
        <section id="ilanlar" className="mt-10">
          <h2>{t('documentsSections.ilan')}</h2>
          <ul className="mt-3 divide-y divide-line">
            {notices.map(({ slug, frontmatter }) => (
              <li key={slug} className={ROW}>
                <Link href={`/haberler/${slug}`} className={LINK}>
                  {frontmatter.title}
                </Link>
                <time dateTime={frontmatter.date} className="text-sm text-fg-2">
                  {formatDate(frontmatter.date, locale)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
