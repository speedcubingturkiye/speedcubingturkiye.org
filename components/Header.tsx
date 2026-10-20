// components/Header.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { LangSwitch } from '@/components/LangSwitch'
import { Logo } from '@/components/Logo'
import { MobileMenu, type MenuItem } from '@/components/MobileMenu'
import { NavDropdown } from '@/components/NavDropdown'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HEADER_NAV, isActiveItem } from '@/lib/nav'

export function Header() {
  const t = useTranslations('nav')
  const common = useTranslations('common')
  const pathname = usePathname()
  // spec §8 menu without Topluluk for now: its channels are in the footer and the home page's follow band. Groups open a
  // dropdown here (NavDropdown) and list their pages under the group's name in the mobile menu.
  // One dropdown at a time: opening a group closes the other at once, so two lists never overlap. The open group is
  // kept with the path it opened on, so any navigation closes it without an effect.
  const [openGroup, setOpenGroup] = useState<{ label: string; path: string } | null>(null)
  const openLabel = openGroup?.path === pathname ? openGroup.label : null
  const setGroupOpen = (label: string, open: boolean) =>
    setOpenGroup((current) => (open ? { label, path: pathname } : current?.label === label ? null : current))
  const items: MenuItem[] = HEADER_NAV.map((item) =>
    'items' in item
      ? { label: t(item.key), active: isActiveItem(pathname, item), items: item.items.map((page) => ({ href: page.href, label: t(page.key) })) }
      : { label: t(item.key), active: isActiveItem(pathname, item), href: item.href },
  )

  return (
    // Sticky, 64px: in-page anchors get scroll-margin-top in globals.css so they land below it (spec §4.1).
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      {/* gap-2 below sm: at 320px the mark (67px) and the right cluster (212px) fill 279 of the 288px, too little for gap-4 */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
        {/* The long logo (236px at h-7) plus the right cluster does not fit 320px; below sm show the mark. */}
        <Link href="/" aria-label={common('home')} className="min-w-0 shrink text-fg">
          <div aria-hidden="true">
            {/* Light mode: the default logo. Dark mode: the kit's inverted logo, which is made for dark grounds (as in the
                footer). sameBox gives both the same box, so switching themes never moves the art by a pixel. */}
            <div className="dark:hidden">
              <Logo variant="mark" className="h-8 w-auto sm:hidden" />
              <Logo variant="long" className="hidden h-7 w-auto sm:block" />
            </div>
            <div className="hidden dark:block">
              <Logo variant="mark" tone="inverted" sameBox className="h-8 w-auto sm:hidden" />
              <Logo variant="long" tone="inverted" sameBox className="hidden h-7 w-auto sm:block" />
            </div>
          </div>
        </Link>

        {/* Desktop row from lg: the long logo, four items and the right cluster need 864px in TR and 810px in EN.
            Below lg the menu button carries the same links. */}
        <nav aria-label={t('mainNav')} className="hidden items-center gap-6 lg:flex">
          {items.map((item) =>
            'items' in item ? (
              <NavDropdown
                key={item.label}
                label={item.label}
                items={item.items}
                active={item.active}
                pathname={pathname}
                open={openLabel === item.label}
                onOpenChange={(open) => setGroupOpen(item.label, open)}
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                // pt-2 pb-1: the 2px underline and the caps' missing descenders put the label 2px above the row's middle
                className="t-label border-b-2 border-transparent pt-2 pb-1 text-fg-2 hover:text-fg aria-[current=page]:border-brand aria-[current=page]:text-fg"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* The language switch, the theme toggle and Üye ol stay in the bar at every width; below lg the menu button joins
            them. Üye ol is a red button of the boxes' height, not a Bilgi page. */}
        <div className="flex items-center gap-2">
          <LangSwitch pathname={pathname} />
          <ThemeToggle />
          <Link
            href="/uye-ol"
            // pt-0.5 and the extra 0.08em on the left: the uppercase label's optical centre, as on the language switch
            className="t-label inline-flex h-9 items-center bg-brand pt-0.5 pr-3 pl-[calc(0.75rem+0.08em)] whitespace-nowrap text-white hover:brightness-[0.92]"
          >
            {t('membership')}
          </Link>
          <div className="lg:hidden">
            <MobileMenu items={items} pathname={pathname} />
          </div>
        </div>
      </div>
    </header>
  )
}
