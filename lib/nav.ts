export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** The competitions pages with their nav label keys, in tab order (lib/section-nav.ts, the header's dropdown). */
export const COMPETITIONS_NAV = [
  { href: '/yarismalar', key: 'calendar' },
  { href: '/yarismalar/ilk-yarismam', key: 'firstCompetition' },
  { href: '/yarismalar/sss', key: 'faq' },
  { href: '/yarismalar/ebeveynler-icin', key: 'forParents' },
] as const

/** The organization pages, at flat URLs, with their nav label keys, in tab order (lib/section-nav.ts, the header's dropdown). */
export const ORG_NAV = [
  { href: '/hakkimizda', key: 'about' },
  { href: '/belgeler', key: 'documents' },
  { href: '/guvenli-ortam', key: 'safeguarding' },
  { href: '/goruntu-bildirimi', key: 'filmingNotice' },
] as const

type HeaderItem = { readonly key: string; readonly href: string } | { readonly key: string; readonly items: readonly { readonly href: string }[] }

/** The header: two dropdown groups, as on the WCA's site where "Information" comes first (components/NavDropdown.tsx),
 *  and two plain links. */
export const HEADER_NAV = [
  { key: 'information', items: ORG_NAV },
  { key: 'competitions', items: COMPETITIONS_NAV },
  { key: 'rankings', href: '/siralamalar' },
  { key: 'news', href: '/haberler' },
] as const satisfies readonly HeaderItem[]

/** A plain link is active on its path and below it; a group when any of its pages is. */
export function isActiveItem(pathname: string, item: HeaderItem): boolean {
  return 'items' in item ? item.items.some((page) => isActivePath(pathname, page.href)) : isActivePath(pathname, item.href)
}
