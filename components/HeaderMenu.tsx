'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

type Props = {
  /** the button's accessible name; it must contain the button's visible text (WCAG 2.5.3) */
  label: string
  /** what the button shows */
  button: ReactNode
  buttonClassName: string
  /** the list's items, given a way to close the list */
  children: (close: () => void) => ReactNode
}

// One header menu open at a time: moving the mouse from one box to the next closes the first at once, so the two lists
// never overlap
let openMenu: (() => void) | null = null

/**
 * A box in the header's right cluster that opens a short list under it (2026-10-22: the language and the theme menus,
 * as on cubing.com). As NavDropdown: a mouse opens it on hover (2026-10-22, the user's call), a touch or the keyboard
 * on a click. Disclosure pattern: a button with aria-expanded, Tab walks the items, Esc closes and gives focus back to
 * the button, a click or focus outside closes it.
 */
export function HeaderMenu({ label, button, buttonClassName, children }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastPointer = useRef('')
  const close = useCallback(() => setOpen(false), [])

  const show = (next: boolean) => {
    clearTimeout(closeTimer.current)
    if (next && openMenu !== close) {
      openMenu?.()
      openMenu = close
    }
    setOpen(next)
  }

  useEffect(() => () => clearTimeout(closeTimer.current), [])
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={root}
      // The full height of the 64px bar, so the list hangs from the header's bottom edge and the pointer never leaves the
      // menu on its way down, as the nav's dropdowns do
      className="relative flex h-16 items-center"
      // Hover is for a mouse only: a touch would open on enter and close again on the click that follows. A short grace
      // before closing lets the pointer cross to a list wider than the box.
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') show(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') closeTimer.current = setTimeout(close, 150)
      }}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={toggle}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType
        }}
        // A mouse click keeps a hover-opened list open; Enter, Space and a touch toggle it (a keyboard click has detail 0)
        onClick={(e) => show(e.detail > 0 && lastPointer.current === 'mouse' ? true : !open)}
        className={buttonClassName}
      >
        {button}
      </button>
      {/* Below sm the list starts at the button's left edge (at 320px the boxes sit left of the middle, and a list
          ending at their right edge would run off the screen); from sm it ends at the right edge, as the boxes sit at the
          bar's right end */}
      <div id={id} hidden={!open} className="absolute top-full left-0 z-50 sm:right-0 sm:left-auto">
        <ul className="min-w-44 border border-line bg-bg py-1 shadow-lg">{children(close)}</ul>
      </div>
    </div>
  )
}
