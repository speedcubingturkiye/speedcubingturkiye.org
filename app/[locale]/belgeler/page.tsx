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
import { Details } from '@/components/Details'
import { OpenDetailsFromHash } from '@/components/OpenDetailsFromHash'
import { SectionNav } from '@/components/SectionNav'

// Section anchors, linked from other pages (for example /guvenli-ortam links #politikalar). The boxes start closed, as on
// the WCA's documents page; OpenDetailsFromHash opens the one a link names.
const ANCHOR: Record<DocSection, string> = { tuzuk: 'tuzuk', yonetmelik: 'yonetmelikler', politika: 'politikalar', mali: 'mali-raporlar' }
const ROW = 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3'
const LINK = 'font-semibold text-brand-ink underline-offset-2 hover:underline'
// Inline, in the text's line: the bylaws box's title and the boxes' names start with an icon
const ICON = 'mr-2 inline-block align-[-4px] text-brand'

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={ICON}>
      <path d="M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h8" />
    </svg>
  )
}

// A bulleted list, as before each section's name on the WCA's documents page
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
      <path d="M9 6h12M9 12h12M9 18h12" stroke="currentColor" strokeWidth="2" />
      <g fill="currentColor">
        <circle cx="4.5" cy="6" r="1.75" />
        <circle cx="4.5" cy="12" r="1.75" />
        <circle cx="4.5" cy="18" r="1.75" />
      </g>
    </svg>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return pageMeta(locale, '/belgeler', { title: t('documentsTitle'), description: t('documentsDescription') })
}

/**
 * One document. The title, with the motion number in front as on the WCA's documents page ("01.2025.1 - Spirit"), opens
 * the PDF in the page's language, or the Turkish one when there is no English file (marked "TR"). The small label opens
 * the other language's PDF when both exist. Box (the bylaws): the row is a box of its own, its title reads as the box's
 * name after a page icon rather than as a link, the link covers the whole box, and the label sits above it.
 */
function DocumentRow({ doc, locale, otherPdf, turkishOnly, box = false }: { doc: SiteDocument; locale: Locale; otherPdf: string; turkishOnly: string; box?: boolean }) {
  const own = doc.file[locale]
  const other: Locale = locale === 'tr' ? 'en' : 'tr'
  const otherFile = own ? doc.file[other] : null
  return (
    <li className={box ? `${ROW} relative px-4` : ROW}>
      <span>
        <a href={own ?? doc.file.tr} hrefLang={own ? locale : 'tr'} type="application/pdf" className={box ? 'font-semibold text-fg after:absolute after:inset-0' : LINK}>
          {box && <DocumentIcon />}
          {doc.code ? `${doc.code} - ${doc.title[locale]}` : doc.title[locale]}
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
        <time dateTime={doc.date}>{formatDate(doc.date, locale)}</time>
        {otherFile && (
          <a
            href={otherFile}
            hrefLang={other}
            type="application/pdf"
            className="t-label relative z-10 border border-line pt-[3px] pr-2 pb-px pl-[calc(0.5rem+0.08em)] text-brand-ink hover:border-brand-ink"
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
  const rows = (list: SiteDocument[], box = false) =>
    list.map((doc) => (
      <DocumentRow key={doc.slug} doc={doc} locale={locale} otherPdf={t('documentsOtherPdf')} turkishOnly={t('documentsTurkishOnly')} box={box} />
    ))
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1>{t('documentsTitle')}</h1>
        <p className="mt-3 text-lg text-fg-2">{t('documentsDescription')}</p>
        <p className="mt-2 text-sm text-fg-2">{t('documentsLanguageNote')}</p>
      </header>
      <SectionNav items={await organizationSectionNav()} />
      <div className="mt-6">
        {sections.length === 0 && notices.length === 0 && <p className="text-fg-2">{t('documentsEmpty')}</p>}
        {sections.map(({ section, docs }) =>
          section === 'tuzuk' ? (
            // The bylaws stand alone at the top, framed like the boxes below: one row each, nothing to open, and the
            // whole box opens the PDF (the rows carry the box's padding, so their links cover it edge to edge).
            <div key={section} id={ANCHOR.tuzuk} className="my-3 border border-line bg-bg-2 hover:border-brand-ink">
              <ul className="divide-y divide-line">{rows(docs, true)}</ul>
            </div>
          ) : (
            <Details key={section} id={ANCHOR[section]} icon={<ListIcon />} summary={`${t(`documentsSections.${section}`)} (${docs.length})`}>
              <ul className="divide-y divide-line">{rows(docs)}</ul>
            </Details>
          ),
        )}
        {notices.length > 0 && (
          <Details id="ilanlar" icon={<ListIcon />} summary={`${t('documentsSections.ilan')} (${notices.length})`}>
            <ul className="divide-y divide-line">
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
          </Details>
        )}
      </div>
      <OpenDetailsFromHash />
    </section>
  )
}
