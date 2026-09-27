import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { organizationSectionNav } from '@/lib/section-nav'
import { MdxPage } from '@/components/MdxPage'
import { SectionNav } from '@/components/SectionNav'

const SLUG = 'organizasyon/tuzuk'
const PDFS = [
  { label: 'TR', file: '/docs/tuzuk-tr.pdf' },
  { label: 'EN', file: '/docs/tuzuk-en.pdf' },
]

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return pageMetadata(locale, SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('common')
  return (
    <MdxPage locale={locale} slug={SLUG} sectionNav={<SectionNav items={await organizationSectionNav()} />}>
      <ul className="mt-6 space-y-2">
        {PDFS.map(({ label, file }) => {
          const exists = existsSync(path.join(process.cwd(), 'public', file))
          return (
            <li key={file} className="flex items-center gap-3 border border-line px-4 py-3">
              <span className="t-label border border-line pt-[3px] pr-2 pb-px pl-[calc(0.5rem+0.08em)]">{label}</span>
              {exists ? (
                <a href={file} className="text-brand-ink underline underline-offset-2" download>
                  {t('bylawsPdf')}: {t('download')}
                </a>
              ) : (
                <span className="text-fg-2">
                  {t('bylawsPdf')}: {t('pdfPending')}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </MdxPage>
  )
}
