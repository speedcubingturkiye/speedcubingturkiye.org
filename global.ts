// global.ts: typed locale + message keys (getLocale() returns 'tr' | 'en', t('bad.key') fails typecheck)
import type { routing } from '@/i18n/routing'
import type messages from './messages/tr.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
