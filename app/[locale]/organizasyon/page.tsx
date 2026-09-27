import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { site } from '@/site.config'
import { pageMetadata } from '@/lib/content'
import { organizationSectionNav } from '@/lib/section-nav'
import { formatDate } from '@/lib/wca/format'
import { MdxPage } from '@/components/MdxPage'
import { SectionNav } from '@/components/SectionNav'

const SLUG = 'organizasyon'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return pageMetadata(locale, SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const tc = await getTranslations('common')
  return (
    <MdxPage locale={locale} slug={SLUG} sectionNav={<SectionNav items={await organizationSectionNav()} />}>
      <section className="mt-10 border-t border-line pt-8">
        <h2>{t('boardTitle')}</h2>
        {site.board.length === 0 ? (
          <p className="mt-3 text-fg-2">{t('boardEmpty')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {site.board.map((member) => (
              <li key={member.name} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span>
                  <span className="font-semibold">{member.name}</span>
                  <span className="ml-2 text-fg-2">{member.role[locale]}</span>
                </span>
                {member.wcaId && (
                  <a
                    href={`https://www.worldcubeassociation.org/persons/${member.wcaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-ink underline underline-offset-2"
                  >
                    {tc('wcaProfile')} ({member.wcaId})
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-fg-2">{t('boardUpdated', { date: formatDate(site.boardUpdatedAt, locale) })}</p>
      </section>
    </MdxPage>
  )
}
