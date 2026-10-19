// components/SectionHeader.tsx
'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import type { SectionPage } from '@/lib/section-nav'

/**
 * A section's header and tabs (the Bilgi and Yarışmalar layouts): the open page's title, lead and note, then the tabs
 * under them, in one frame for the whole section, so the title never moves from page to page and the tabs move only by
 * the difference in the text above them. From md the tabs are one row; below md they fold into a box naming the open
 * page, which grows open like the FAQ boxes (accordion in globals.css), instead of a row that scrolls sideways.
 */
export function SectionHeader({ pages }: { pages: SectionPage[] }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const current = pages.find((page) => page.href === pathname)
  return (
    <>
      {current && (
        <header>
          <h1>{current.title}</h1>
          {/* max-w-3xl: a reading width in the calendar's wider frame */}
          {current.lead && <p className="mt-3 max-w-3xl text-lg text-fg-2">{current.lead}</p>}
          {current.note && <p className="mt-2 max-w-3xl text-sm text-fg-2">{current.note}</p>}
        </header>
      )}
      <nav aria-label={t('sectionNav')} className="mt-8">
        <ul className="hidden flex-wrap gap-2 border-b border-line md:flex">
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={page === current ? 'page' : undefined}
                // 13px/11px instead of py-3: optical centre of the uppercase label (DESIGN.md, "Optical centring")
                className="t-label inline-flex border-b-2 border-transparent px-3 pt-[13px] pb-[11px] text-fg-2 hover:text-fg aria-[current=page]:border-brand aria-[current=page]:text-fg"
              >
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
        {/* Keyed on the path: the layout stays mounted, so a tap on a page closes the box this way */}
        <details key={pathname} className="accordion group/section border border-line md:hidden">
          <summary className="t-label flex cursor-pointer list-none items-center justify-between gap-3 px-4 pt-[13px] pb-[11px] text-fg [&::-webkit-details-marker]:hidden">
            {current?.label}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 transition-transform group-open/section:rotate-180">
              <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </summary>
          <div className="accordion-body">
            <div>
              <ul className="border-t border-line py-1">
                {pages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      aria-current={page === current ? 'page' : undefined}
                      className="block px-4 py-2 text-fg aria-[current=page]:font-semibold aria-[current=page]:text-brand-ink"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </nav>
    </>
  )
}
