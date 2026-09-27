// components/Pager.tsx
import type { ComponentProps } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { pageItems } from '@/lib/rankings-view'

type Props = {
  page: number
  last: number
  /** the link to one page of the list */
  href: (page: number) => ComponentProps<typeof Link>['href']
}

// Page navigation item: a 40px hairline square, the current page inverted
const PAGE =
  'inline-flex h-10 min-w-10 items-center justify-center border border-line px-3 text-sm font-semibold tabular-nums hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg'
const PAGE_OFF = 'inline-flex h-10 min-w-10 items-center justify-center border border-line px-3 text-sm font-semibold text-fg-2 opacity-50'
// Phone page navigation item: no px-3 and min-w-0, so the squares can shrink and the row still fits one line at 320px.
const PAGE_PHONE =
  'inline-flex h-10 w-10 min-w-0 items-center justify-center border border-line text-sm font-semibold tabular-nums hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg'
const PAGE_PHONE_OFF = 'inline-flex h-10 w-10 min-w-0 items-center justify-center border border-line text-fg-2 opacity-50'
// Chevron paths from the hero carousel's prev/next controls (components/HeroCarousel.tsx), reused for the phone pager.
const chevron = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
)

/**
 * Page navigation under a paged list (the rankings, the past competitions); nothing when the list fits one page.
 * Two navs, one shown per breakpoint: current ± 1 on phones (chevron squares, no text, one line down to 320px),
 * ± 2 from 640px (text labels).
 */
export function Pager({ page, last, href }: Props) {
  const t = useTranslations('common')
  if (last <= 1) return null

  const nav = (radius: number, phone: boolean) => (
    <nav
      aria-label={t('pages')}
      className={phone ? 'mt-6 flex items-center gap-0.5 sm:hidden' : 'mt-6 hidden flex-wrap items-center gap-1 sm:flex'}
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" aria-label={phone ? t('prev') : undefined} className={phone ? PAGE_PHONE : PAGE}>
          {phone ? chevron('M15 5l-7 7 7 7') : t('prev')}
        </Link>
      ) : (
        <span aria-hidden="true" className={phone ? PAGE_PHONE_OFF : PAGE_OFF}>
          {phone ? chevron('M15 5l-7 7 7 7') : t('prev')}
        </span>
      )}
      {pageItems(page, last, radius).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true" className={phone ? 'w-3 shrink-0 text-center' : 'px-1 text-fg-2'}>
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-label={t('pageN', { n: item })}
            aria-current={item === page ? 'page' : undefined}
            className={phone ? PAGE_PHONE : PAGE}
          >
            {item}
          </Link>
        ),
      )}
      {page < last ? (
        <Link href={href(page + 1)} rel="next" aria-label={phone ? t('next') : undefined} className={phone ? PAGE_PHONE : PAGE}>
          {phone ? chevron('M9 5l7 7-7 7') : t('next')}
        </Link>
      ) : (
        <span aria-hidden="true" className={phone ? PAGE_PHONE_OFF : PAGE_OFF}>
          {phone ? chevron('M9 5l7 7-7 7') : t('next')}
        </span>
      )}
    </nav>
  )

  return (
    <>
      {nav(1, true)}
      {nav(2, false)}
    </>
  )
}
