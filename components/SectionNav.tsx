// components/SectionNav.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

type Item = {
  href: string
  label: string
  /** @cubing/icons event id, e.g. '333' */
  icon?: string
  /** the label's language when it is not the page's: the uppercase label follows it (R8) */
  lang?: string
}

export function SectionNav({ items, label }: { items: Item[]; label?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // The list scrolls back to the left on every navigation, which can leave the active tab
  // off-screen on phones (e.g. Square-1 on /siralamalar/sq1/tekli). Re-centre it after mount
  // and on each route change; scrollLeft only moves this container, never the page.
  useEffect(() => {
    const nav = navRef.current
    const active = activeRef.current
    if (!nav || !active) return
    // Rects, not offsetLeft: offsetLeft is measured from the offset parent, which includes the page gutter on wide screens
    const a = active.getBoundingClientRect()
    const n = nav.getBoundingClientRect()
    nav.scrollLeft += a.left - n.left - (n.width - a.width) / 2
  }, [pathname])

  return (
    <nav ref={navRef} aria-label={label ?? t('sectionNav')} className="tab-scroller -mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b border-line">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={item.href}
                lang={item.lang}
                aria-current={active ? 'page' : undefined}
                // 13px/11px instead of py-3: optical centre of the uppercase label (DESIGN.md, "Optical centring")
                className={`t-label inline-flex items-center gap-1.5 border-b-2 px-3 pt-[13px] pb-[11px] ${
                  active ? 'border-brand text-fg' : 'border-transparent text-fg-2 hover:text-fg'
                }`}
              >
                {item.icon && <span className={`cubing-icon event-${item.icon} text-base leading-none`} aria-hidden="true" />}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
