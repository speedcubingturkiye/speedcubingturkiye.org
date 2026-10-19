// components/MobileMenu.tsx
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/** A header entry: a plain link, or a group whose pages the menu lists under its name (a dropdown on desktop). */
export type MenuItem = { label: string; active: boolean } & ({ href: string } | { items: { href: string; label: string }[] })

type Props = { items: MenuItem[]; pathname: string }

/**
 * <details>-based dropdown, no JS dependency. Keyed on locale + pathname, so it remounts (closes) after any navigation,
 * a TR/EN switch included (the unprefixed pathname stays the same across locales).
 * The button is a square icon like the theme toggle: a hamburger, a cross while open. The panel slides down from under
 * the header when it opens and back up when it closes (mobile-menu in globals.css, CSS only).
 * The panel spans the sticky header's width and centres its rows in the header's max-w-6xl container, so they line up
 * with the logo and the menu button. It holds only the links: the language switch and the theme toggle sit in the
 * header bar.
 */
export function MobileMenu({ items, pathname }: Props) {
  const t = useTranslations('common')
  const locale = useLocale()
  return (
    <details key={`${locale}${pathname}`} className="mobile-menu group">
      <summary className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center border border-line text-fg hover:border-fg [&::-webkit-details-marker]:hidden">
        <span className="sr-only">{t('menu')}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="group-open:hidden">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="hidden group-open:block">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </summary>
      {/* A clip window under the header's 64px row and 1px bottom border, so the sliding panel comes out from under the
          border and never covers the header */}
      <div className="absolute inset-x-0 top-[65px] z-50 overflow-hidden">
        <div className="mobile-menu-panel border-b border-line bg-bg">
          <div className="mx-auto max-w-6xl">
            <nav aria-label={t('menu')} className="px-4 py-2">
              {items.map((item) =>
                'items' in item ? (
                  // A group, as in the WCA's mobile menu: closed when the menu opens, a tap shows its pages indented under
                  // it, growing open like the FAQ boxes (accordion in globals.css). A named group (group/sub): the menu's
                  // own <details> is an open `group` too.
                  <details key={item.label} className="accordion group/sub border-b border-line last:border-b-0">
                    <summary
                      data-active={item.active}
                      className="t-label flex cursor-pointer list-none items-center gap-1.5 pt-[13px] pb-[11px] text-fg data-[active=true]:text-brand-ink [&::-webkit-details-marker]:hidden"
                    >
                      {item.label}
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="transition-transform group-open/sub:rotate-180">
                        <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </summary>
                    <div className="accordion-body">
                      <div>
                        <div className="pb-2">
                          {item.items.map((page) => (
                            <Link
                              key={page.href}
                              href={page.href}
                              aria-current={pathname === page.href ? 'page' : undefined}
                              className="block py-2 pl-4 text-fg aria-[current=page]:font-semibold aria-[current=page]:text-brand-ink"
                            >
                              {page.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className="t-label block border-b border-line pt-[13px] pb-[11px] text-fg last:border-b-0 aria-[current=page]:text-brand-ink"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </div>
      </div>
    </details>
  )
}
