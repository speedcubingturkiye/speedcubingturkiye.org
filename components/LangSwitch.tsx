// components/LangSwitch.tsx
import NextLink from 'next/link'
import { Suspense, useLayoutEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// The language each page switches to
const OTHER: Record<Locale, { locale: Locale; code: string; name: string }> = {
  tr: { locale: 'en', code: 'EN', name: 'English' },
  en: { locale: 'tr', code: 'TR', name: 'Türkçe' },
}

// The reader's place across a switch. Turkish and English wrap to different heights, so the same scroll offset lands on
// different text (58 to 113 px apart on a 375 px phone). The click notes the first block below the header and its
// height on screen; the new language's header scrolls the block with the same position among the blocks back there.
const BLOCKS = 'main :is(h1, h2, h3, h4, p, li, tr, figure, dt)'
let place: { index: number; top: number } | null = null

function notePlace() {
  place = null
  if (scrollY < 1) return // at the top: the new page starts at the top as well
  const below = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
  const blocks = [...document.querySelectorAll(BLOCKS)]
  const index = blocks.findIndex((b) => b.getBoundingClientRect().top >= below)
  if (index >= 0) place = { index, top: blocks[index].getBoundingClientRect().top }
}

// Runs in a layout effect, inside React's view transition, so the new image already shows the reader's block in place.
// --place-shift tells the crossfade how far the page moved (globals.css), so the old image moves along with it.
function restorePlace() {
  const block = place && document.querySelectorAll(BLOCKS)[place.index]
  const before = scrollY
  if (place && block) window.scrollTo({ top: before + block.getBoundingClientRect().top - place.top, behavior: 'instant' })
  document.documentElement.style.setProperty('--place-shift', `${scrollY - before}px`)
  place = null
}

/**
 * One 36px square like the theme toggle, showing the other language's code (EN on Turkish pages, TR on English ones).
 * No flags: a flag names a country, not a language. The link is named in its own language ("EN English") with a
 * matching `lang`, so the visible code is part of the accessible name (WCAG 2.5.3). scroll={false} plus the place kept
 * above keep the reader where they are, and the query (a list's ?sayfa, a ranking's ?boyut and ?ara) keeps them on the
 * same page of a list; the root layout crossfades the two languages. `pathname` is the internal (unprefixed) path from
 * usePathname().
 */
export function LangSwitch({ pathname }: { pathname: string }) {
  // useSearchParams needs a Suspense boundary: a statically rendered page prerenders the fallback (the link without
  // the query) and fills the query in after hydration
  return (
    <Suspense fallback={<SwitchLink pathname={pathname} />}>
      <SwitchWithQuery pathname={pathname} />
    </Suspense>
  )
}

function SwitchWithQuery({ pathname }: { pathname: string }) {
  const query = Object.fromEntries(useSearchParams())
  return <SwitchLink pathname={pathname} query={query} />
}

function SwitchLink({ pathname, query }: { pathname: string; query?: Record<string, string> }) {
  const other = OTHER[useLocale()]
  useLayoutEffect(restorePlace, [])
  return (
    <NextLink
      // A plain Next link: next-intl's Link forces the default locale's prefix on a switch (/tr/…) for its locale
      // cookie, which this site keeps off, so the address bar showed /tr/… until a reload redirected it.
      href={getPathname({ href: query && Object.keys(query).length ? { pathname, query } : pathname, locale: other.locale })}
      lang={other.locale}
      hrefLang={other.locale}
      scroll={false}
      onClick={notePlace}
      // pl offsets the label's letter-spacing after the last letter and pt the room caps leave for descenders, so the
      // code sits in the optical centre (measured 0.5px left and 1.1px high without them)
      className="t-label inline-flex h-9 w-9 items-center justify-center border border-line pt-0.5 pl-[0.08em] text-fg hover:border-fg"
    >
      {other.code}
      <span className="sr-only">{other.name}</span>
    </NextLink>
  )
}
