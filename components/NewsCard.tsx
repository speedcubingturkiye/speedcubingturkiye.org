// components/NewsCard.tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { NewsFrontmatter } from '@/lib/content'
import { formatDate } from '@/lib/wca/format'

type Props = {
  slug: string
  frontmatter: NewsFrontmatter
  locale: Locale
  /** h2 on list pages whose only heading above is the h1; h3 under a section h2 (home) */
  headingLevel?: 'h2' | 'h3'
}

export async function NewsCard({ slug, frontmatter, locale, headingLevel = 'h3' }: Props) {
  const t = await getTranslations('news')
  const Heading = headingLevel
  // One hairline chip style for every category; the row's text-fg-2 colours both chips
  // Optical centre for the uppercase chip: 1px of padding moves from the bottom to the top, the tracking is added left
  const chip = 't-label border border-line pt-[3px] pr-1.5 pb-px pl-[calc(0.375rem+0.08em)] text-[11px]'
  return (
    <article className="flex h-full flex-col border border-line p-5 hover:border-fg">
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg-2">
        <time dateTime={frontmatter.date}>{formatDate(frontmatter.date, locale)}</time>
        <span className={chip}>{t(`category.${frontmatter.category}`)}</span>
        {frontmatter.auto && <span className={chip}>{t('auto')}</span>}
      </div>
      {/* Card title, not a section heading: normal case and width whatever the level */}
      <Heading className="mt-3 text-xl font-bold normal-case font-stretch-normal leading-snug">
        <Link href={`/haberler/${slug}`} className="hover:text-brand-ink">
          {frontmatter.title}
        </Link>
      </Heading>
      {/* max-w-prose: a lone card on the home page spans the band, the text keeps a reading measure */}
      {frontmatter.description && <p className="mt-2 max-w-prose text-fg-2">{frontmatter.description}</p>}
    </article>
  )
}
