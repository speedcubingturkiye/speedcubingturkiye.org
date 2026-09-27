// i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'as-needed', // tr unprefixed, en under /en
  localeDetection: false, // URL decides; no Accept-Language redirect
  localeCookie: false, // the cookie policy promises "no cookies": must stay false
})

export type Locale = (typeof routing.locales)[number]
