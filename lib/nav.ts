export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** The organization pages, at flat URLs, with their nav label keys, in tab order (lib/section-nav.ts). */
export const ORG_NAV = [
  { href: '/hakkimizda', key: 'about' },
  { href: '/belgeler', key: 'documents' },
  { href: '/guvenli-ortam', key: 'safeguarding' },
  { href: '/goruntu-bildirimi', key: 'filmingNotice' },
  { href: '/gonullu-ol', key: 'volunteer' },
] as const

/** A header item's state. "Organizasyon" links to /hakkimizda and stays active on every organization page; any other
 *  item matches its own path and what lies under it. */
export function isActiveNav(pathname: string, href: string): boolean {
  if (href === ORG_NAV[0].href) return ORG_NAV.some((page) => isActivePath(pathname, page.href))
  return isActivePath(pathname, href)
}
