// components/ThemeToggle.tsx
'use client'

import { useLayoutEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

/** Writes the choice the inline script in the root layout reads on the next load (localStorage, never a cookie). */
function setTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // storage blocked (private mode): the theme still switches for this page view
  }
}

/**
 * Sun/moon button (spec §3.4). Two buttons, one shown per theme through the `dark:` variant, so the component
 * needs no state and cannot mismatch on hydration.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('common')
  // The layout's inline script only runs when the browser parses server HTML. When React renders <html> itself (a TR/EN
  // switch remounts the root layout and strips data-theme; a 404 arrives as Next's error shell and renders on the
  // client), apply the script's rule here, before paint.
  useLayoutEffect(() => {
    const root = document.documentElement
    if (root.dataset.theme) return
    try {
      let theme = localStorage.getItem('theme')
      if (theme !== 'light' && theme !== 'dark') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.dataset.theme = theme
    } catch {
      // storage blocked: no attribute, the light default, exactly as the inline script leaves it
    }
  }, [])
  const toDark = useRef<HTMLButtonElement>(null)
  const toLight = useRef<HTMLButtonElement>(null)
  // A 300ms crossfade of the whole page (View Transitions API; its duration is in globals.css), instant where the API is
  // missing or the visitor prefers reduced motion. The clicked button hides with its theme, so focus moves to the other one.
  const switchTo = (theme: 'light' | 'dark') => {
    const [from, to] = theme === 'dark' ? [toDark, toLight] : [toLight, toDark]
    const keepFocus = document.activeElement === from.current
    const apply = () => {
      setTheme(theme)
      if (keepFocus) to.current?.focus()
    }
    if (typeof document.startViewTransition !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) apply()
    else document.startViewTransition(apply)
  }
  const base = `h-9 w-9 items-center justify-center border border-line text-fg hover:border-fg ${className}`
  return (
    <>
      <button ref={toDark} type="button" onClick={() => switchTo('dark')} aria-label={t('themeDark')} className={`inline-flex ${base} dark:hidden`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      </button>
      <button ref={toLight} type="button" onClick={() => switchTo('light')} aria-label={t('themeLight')} className={`hidden ${base} dark:inline-flex`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </>
  )
}
