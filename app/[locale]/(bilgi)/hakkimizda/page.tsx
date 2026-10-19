import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { site } from '@/site.config'
import { pageMetadata } from '@/lib/content'
import { formatDate } from '@/lib/wca/format'
import { MdxBody } from '@/components/MdxPage'

const SLUG = 'hakkimizda'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return pageMetadata(locale, SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const tc = await getTranslations('common')
  // The two boards of the Tüzük (Madde 6 and 7), each under its own heading; an empty list is left out.
  const boards = [
    { title: t('boardTitle'), members: site.board },
    { title: t('auditBoardTitle'), members: site.auditBoard },
  ].filter((b) => b.members.length > 0)
  return (
    <>
      <MdxBody locale={locale} slug={SLUG} />
      <section className="mt-10 border-t border-line pt-8">
        {boards.length === 0 && <p className="text-fg-2">{t('boardEmpty')}</p>}
        {boards.map(({ title, members }, i) => (
          <div key={title} className={i > 0 ? 'mt-10' : undefined}>
            <h2>{title}</h2>
            <ul className="mt-4 divide-y divide-line">
              {members.map((member) => (
                <li key={member.name} className="py-3">
                  {/* The name opens the WCA profile, plain like the competition names (CompetitionRow) */}
                  {member.wcaId ? (
                    <a
                      href={`https://www.worldcubeassociation.org/persons/${member.wcaId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:text-brand-ink"
                    >
                      {member.name}
                      <span className="sr-only">
                        , {tc('wcaProfile')} ({member.wcaId})
                      </span>
                    </a>
                  ) : (
                    <span className="font-semibold">{member.name}</span>
                  )}
                  <span className="ml-2 text-fg-2">{member.role[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-4 text-sm text-fg-2">{t('boardUpdated', { date: formatDate(site.boardUpdatedAt, locale) })}</p>
      </section>
    </>
  )
}
