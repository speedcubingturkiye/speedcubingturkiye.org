// components/Header.tsx
'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { LangSwitch } from '@/components/LangSwitch'
import { Logo } from '@/components/Logo'
import { MobileMenu } from '@/components/MobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { isActivePath } from '@/lib/nav'

// spec §8 menu without Topluluk for now: its channels are in the footer and the home page's follow band
const NAV = [
  { href: '/yarismalar', key: 'competitions' },
  { href: '/siralamalar', key: 'rankings' },
  { href: '/haberler', key: 'news' },
  { href: '/organizasyon', key: 'organization' },
] as const

export function Header() {
  const t = useTranslations('nav')
  const common = useTranslations('common')
  const pathname = usePathname()
  const items = NAV.map((n) => ({ href: n.href, label: t(n.key) }))
  const isActive = (href: string) => isActivePath(pathname, href)

  return (
    // Sticky, 64px: in-page anchors get scroll-margin-top in globals.css so they land below it (spec §4.1).
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
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
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              // pt-2 pb-1: the 2px underline and the caps' missing descenders put the label 2px above the row's middle
              className="t-label border-b-2 border-transparent pt-2 pb-1 text-fg-2 hover:text-fg aria-[current=page]:border-brand aria-[current=page]:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* The language switch and the theme toggle stay in the bar at every width; below lg the menu button joins them */}
        <div className="flex items-center gap-2">
          <LangSwitch pathname={pathname} />
          <ThemeToggle />
          <div className="lg:hidden">
            <MobileMenu items={items} pathname={pathname} />
          </div>
        </div>
      </div>
    </header>
  )
}
