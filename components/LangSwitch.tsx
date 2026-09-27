// components/LangSwitch.tsx
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// The language each page switches to
const OTHER: Record<Locale, { locale: Locale; code: string; name: string }> = {
  tr: { locale: 'en', code: 'EN', name: 'English' },
  en: { locale: 'tr', code: 'TR', name: 'Türkçe' },
}

/**
 * One 36px square like the theme toggle, showing the other language's code (EN on Turkish pages, TR on English ones).
 * No flags: a flag names a country, not a language. The link is named in its own language ("EN English") with a
 * matching `lang`, so the visible code is part of the accessible name (WCAG 2.5.3). scroll={false} keeps the reader
 * where they are, and the query (a list's ?sayfa, a ranking's ?boyut and ?ara) keeps them on the same page of a list;
 * the root layout crossfades the two languages. `pathname` is the internal (unprefixed) path from usePathname().
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
  return (
    <Link
      href={{ pathname, query }}
      locale={other.locale}
      lang={other.locale}
      hrefLang={other.locale}
      scroll={false}
      // pl offsets the label's letter-spacing after the last letter and pt the room caps leave for descenders, so the
      // code sits in the optical centre (measured 0.5px left and 1.1px high without them)
      className="t-label inline-flex h-9 w-9 items-center justify-center border border-line pt-0.5 pl-[0.08em] text-fg hover:border-fg"
    >
      {other.code}
      <span className="sr-only">{other.name}</span>
    </Link>
  )
}
