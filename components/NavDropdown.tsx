'use client'

import { useEffect, useId, useRef } from 'react'
import { Link } from '@/i18n/navigation'

type Props = {
  label: string
  items: { href: string; label: string }[]
  active: boolean
  pathname: string
  /** Controlled by the header, which keeps one group open at a time */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * A header group that opens a list of its pages, as the WCA's "Information" menu: on hover and on click, and the label
 * is no page of its own. Disclosure pattern (a button with aria-expanded), not an ARIA menu: Tab walks the links, Esc
 * closes and gives focus back to the button, a click or focus outside closes it.
 */
export function NavDropdown({ label, items, active, pathname, open, onOpenChange }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastPointer = useRef('')

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onOpenChange(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  // Hover is for a mouse only: a touch would open on enter and close again on the click that follows.
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    onOpenChange(true)
  }
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') closeTimer.current = setTimeout(() => onOpenChange(false), 150)
  }

  return (
    <div
      ref={root}
      // The full height of the 64px bar, so the list hangs from the header's bottom edge and the pointer never leaves the
      // group on its way down
      className="relative flex h-16 items-center"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) onOpenChange(false)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-active={active}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType
        }}
        // A mouse click keeps a hover-opened list open; Enter, Space and a touch toggle it (a keyboard click has detail 0).
        onClick={(e) => onOpenChange(e.detail > 0 && lastPointer.current === 'mouse' ? true : !open)}
        // pt-2 pb-1: the same box as the plain header links, so the underline sits on one line
        className="t-label inline-flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent pt-2 pb-1 text-fg-2 hover:text-fg aria-expanded:text-fg data-[active=true]:border-brand data-[active=true]:text-fg"
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={open ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {/* -left-4 cancels the items' px-4, so their text starts under the label's first letter; top-full puts the list's
          top border on the header's bottom border */}
      <div id={id} hidden={!open} className="absolute top-full -left-4 z-50">
        <ul className="min-w-56 border border-line bg-bg py-1 shadow-lg">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => onOpenChange(false)}
                className="block px-4 py-2 text-sm text-fg-2 hover:bg-bg-2 hover:text-fg aria-[current=page]:font-semibold aria-[current=page]:text-fg"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
