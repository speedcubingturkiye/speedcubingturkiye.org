// components/WcaTabs.tsx
import type { ComponentPropsWithoutRef } from 'react'
import { getTranslations } from 'next-intl/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { Details } from '@/components/Details'
import { getCompetitionTabs } from '@/lib/wca/competitions'
import type { Locale } from '@/i18n/routing'
import { hardWrap, localizeTab, safeHref } from '@/lib/wca/markdown'
import type { CompetitionDetail } from '@/lib/wca/types'

// Organizer-written Markdown is compiled as plain Markdown (format 'md'): raw HTML is dropped and {…} stays text.
// Links keep only http(s) and mailto URLs, images become links (the page loads nothing from third-party hosts), and
// headings shrink to fit inside an accordion.
const heading = (Tag: 'h3' | 'h4') =>
  function Heading({ children }: ComponentPropsWithoutRef<'h3'>) {
    return <Tag className="mt-5 mb-2 text-base font-bold text-fg first:mt-0">{children}</Tag>
  }
const components = {
  h1: heading('h3'),
  h2: heading('h3'),
  h3: heading('h4'),
  h4: heading('h4'),
  h5: heading('h4'),
  h6: heading('h4'),
  a({ href, children }: ComponentPropsWithoutRef<'a'>) {
    const url = safeHref(href)
    return url ? (
      <a href={url} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    ) : (
      <>{children}</>
    )
  },
  img({ src, alt }: ComponentPropsWithoutRef<'img'>) {
    const url = safeHref(src)
    return url ? (
      <a href={url} rel="noopener noreferrer" target="_blank">
        {alt || url}
      </a>
    ) : (
      <>{alt}</>
    )
  },
  table({ children }: ComponentPropsWithoutRef<'table'>) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    )
  },
}

// Compact prose for the accordions (components/Prose.tsx is sized for whole pages)
const PROSE =
  'leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-fg [&_hr]:my-6 [&_hr]:border-line [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_blockquote]:border-l [&_blockquote]:border-line [&_blockquote]:pl-4'

async function body(source: string) {
  try {
    const { content } = await compileMDX({ source: hardWrap(source), options: { mdxOptions: { format: 'md', remarkPlugins: [remarkGfm] } }, components })
    return content
  } catch {
    // Unparseable content still shows, as plain text
    return <p className="whitespace-pre-line">{source}</p>
  }
}

/** Section 6 of the competition page: the organizers' tabs from the WCA page, as accordions in the page's language. */
export async function WcaTabs({ comp, locale }: { comp: CompetitionDetail; locale: Locale }) {
  const t = await getTranslations('competitions')
  const tabs = (await getCompetitionTabs(comp.id))?.map((tab) => localizeTab(tab, locale)) ?? null
  if (!tabs) {
    // The tabs request failed: the tab names, each linking to the WCA page
    return (
      <section className="mt-10">
        <h2>{t('moreOnWca')}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(comp.tab_names ?? []).map((name) => (
            <li key={name}>
              <a href={comp.url} rel="noopener noreferrer" target="_blank" className="inline-block border border-line px-3 py-1 text-sm hover:border-fg">
                {localizeTab({ name, content: '' }, locale).name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    )
  }
  if (tabs.length === 0) return null
  const bodies = await Promise.all(tabs.map((tab) => body(tab.content)))
  return (
    <section className="mt-10">
      <h2>{t('infoTitle')}</h2>
      <div className="mt-3">
        {tabs.map((tab, i) => (
          <Details key={i} summary={tab.name}>
            <div className={PROSE}>{bodies[i]}</div>
          </Details>
        ))}
      </div>
    </section>
  )
}
