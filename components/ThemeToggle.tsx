// components/ThemeToggle.tsx
'use client'

import { useEffect, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { HeaderMenu } from '@/components/HeaderMenu'

type Pref = 'system' | 'light' | 'dark'
const DARK = '(prefers-color-scheme: dark)'

/** The choice the theme menu stored: "light" or "dark" (localStorage, never a cookie), else "system". */
function stored(): Pref {
  try {
    const pref = localStorage.getItem('theme')
    return pref === 'light' || pref === 'dark' ? pref : 'system'
  } catch {
    return 'system'
  }
}

/** <html data-theme> for the CSS and data-theme-pref for the button's icon, as the head script sets them
 *  (lib/head-scripts.ts); "system" goes by the operating system. */
function apply(pref: Pref) {
  const root = document.documentElement
  root.dataset.themePref = pref
  root.dataset.theme = pref === 'system' ? (matchMedia(DARK).matches ? 'dark' : 'light') : pref
}

// The choice as React state, for the list's aria-pressed: "system" on the server and while hydrating, the stored one
// right after, so hydration never mismatches
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function choose(pref: Pref) {
  try {
    if (pref === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', pref)
  } catch {
    // storage blocked (private mode): the theme still switches for this page view
  }
  // A 300ms crossfade of the whole page (View Transitions API; its duration is in globals.css), instant where the API is
  // missing or the visitor prefers reduced motion
  const run = () => apply(pref)
  if (typeof document.startViewTransition !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) run()
  else document.startViewTransition(run)
  listeners.forEach((listener) => listener())
}

const ICONS: Record<Pref, ReactNode> = {
  // Half light, half dark: the operating system decides
  system: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </svg>
  ),
  light: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
}

/**
 * The theme menu (spec §3.4; 2026-10-22, as on cubing.com): Sistem, Açık, Koyu. Sistem, the default, follows the
 * operating system, also when it changes while the page is open. The button shows the choice's icon from the head
 * script's attribute on <html>, so it is right from the first paint.
 */
export function ThemeToggle() {
  const t = useTranslations('common')
  const pref = useSyncExternalStore(subscribe, stored, () => 'system')
  // The head script only runs when the browser parses server HTML. When React renders <html> itself (a TR/EN switch
  // remounts the root layout and strips the attributes; a 404 arrives as Next's error shell and renders on the client),
  // apply its rule here, before paint.
  useLayoutEffect(() => {
    if (!document.documentElement.dataset.theme) apply(stored())
  }, [])
  useEffect(() => {
    const media = matchMedia(DARK)
    const follow = () => {
      if (stored() === 'system') apply('system')
    }
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])
  const options: [Pref, string][] = [
    ['system', t('themeSystem')],
    ['light', t('themeLight')],
    ['dark', t('themeDark')],
  ]
  return (
    <HeaderMenu
      label={t('theme')}
      buttonClassName="inline-flex h-9 w-9 items-center justify-center border border-line text-fg hover:border-fg aria-expanded:border-fg"
      button={
        <>
          <span className="hidden [html[data-theme-pref=light]_&]:inline-flex">{ICONS.light}</span>
          <span className="hidden [html[data-theme-pref=dark]_&]:inline-flex">{ICONS.dark}</span>
          <span className="inline-flex [html[data-theme-pref=dark]_&]:hidden [html[data-theme-pref=light]_&]:hidden">{ICONS.system}</span>
        </>
      }
    >
      {(close) =>
        options.map(([value, label]) => (
          <li key={value}>
            <button
              type="button"
              aria-pressed={pref === value}
              onClick={() => {
                choose(value)
                close()
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-2 hover:bg-bg-2 hover:text-fg aria-pressed:bg-bg-2 aria-pressed:font-semibold aria-pressed:text-fg"
            >
              {ICONS[value]}
              {label}
            </button>
          </li>
        ))
      }
    </HeaderMenu>
  )
}
