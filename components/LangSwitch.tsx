// components/LangSwitch.tsx
import NextLink from 'next/link'
import { Suspense, useLayoutEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { HeaderMenu } from '@/components/HeaderMenu'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// The languages, each named in itself. No flags: a flag names a country, not a language.
const LANGUAGES: { locale: Locale; name: string }[] = [
  { locale: 'tr', name: 'Türkçe' },
  { locale: 'en', name: 'English' },
]

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

/** The visitor's own choice: from now on the head script (lib/head-scripts.ts) no longer goes by the browser's languages. */
function remember(locale: Locale) {
  try {
    localStorage.setItem('locale', locale)
  } catch {
    // storage blocked (private mode): the choice holds for this visit
  }
}

/**
 * The language menu (2026-10-22, as on cubing.com): the translate mark and the page's language, a list of both under it.
 * Below sm the mark alone, a 36px square like the theme menu's, so the header still fits 320px. The links keep the
 * reader where they are (scroll={false} plus the place kept above) and on the same page of a list (the query: a list's
 * ?sayfa, a ranking's ?boyut and ?ara); the root layout crossfades the two languages. `pathname` is the internal
 * (unprefixed) path from usePathname().
 */
export function LangSwitch({ pathname }: { pathname: string }) {
  // useSearchParams needs a Suspense boundary: a statically rendered page prerenders the fallback (the links without
  // the query) and fills the query in after hydration
  return (
    <Suspense fallback={<LangMenu pathname={pathname} />}>
      <LangMenuWithQuery pathname={pathname} />
    </Suspense>
  )
}

function LangMenuWithQuery({ pathname }: { pathname: string }) {
  const query = Object.fromEntries(useSearchParams())
  return <LangMenu pathname={pathname} query={query} />
}

function LangMenu({ pathname, query }: { pathname: string; query?: Record<string, string> }) {
  const locale = useLocale() as Locale
  const t = useTranslations('common')
  useLayoutEffect(restorePlace, [])
  const current = LANGUAGES.find((l) => l.locale === locale) ?? LANGUAGES[0]
  return (
    <HeaderMenu
      // The visible name is part of the accessible name (WCAG 2.5.3): "Dil: Türkçe"
      label={`${t('language')}: ${current.name}`}
      buttonClassName="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 border border-line px-2 text-fg hover:border-fg aria-expanded:border-fg"
      button={
        <>
          {/* The translate mark (Material Icons "translate", Apache 2.0) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z" />
          </svg>
          <span lang={locale} className="hidden text-sm font-semibold sm:inline">
            {current.name}
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="hidden transition-transform in-aria-expanded:rotate-180 sm:block">
            <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </>
      }
    >
      {(close) =>
        LANGUAGES.map((l) => (
          <li key={l.locale}>
            <NextLink
              // A plain Next link: next-intl's Link forces the default locale's prefix on a switch (/tr/…) for its locale
              // cookie, which this site keeps off, so the address bar showed /tr/… until a reload redirected it.
              href={getPathname({ href: query && Object.keys(query).length ? { pathname, query } : pathname, locale: l.locale })}
              lang={l.locale}
              hrefLang={l.locale}
              scroll={false}
              aria-current={l.locale === locale ? 'true' : undefined}
              onClick={(e) => {
                remember(l.locale)
                close()
                if (l.locale === locale) e.preventDefault()
                else notePlace()
              }}
              className="flex items-center justify-between gap-6 px-4 py-2 text-sm text-fg-2 hover:bg-bg-2 hover:text-fg aria-[current=true]:bg-bg-2 aria-[current=true]:font-semibold aria-[current=true]:text-fg"
            >
              {l.name}
              {l.locale === locale ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12.5 10 17.5 19 7" />
                </svg>
              ) : null}
            </NextLink>
          </li>
        ))
      }
    </HeaderMenu>
  )
}
