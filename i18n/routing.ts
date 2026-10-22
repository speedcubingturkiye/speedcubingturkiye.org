// i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'as-needed', // tr unprefixed, en under /en
  localeDetection: false, // the server never redirects; the browser picks by its languages (lib/head-scripts.ts)
  localeCookie: false, // the cookie policy promises "no cookies": must stay false
})

export type Locale = (typeof routing.locales)[number]
