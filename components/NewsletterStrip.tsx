// components/NewsletterStrip.tsx
'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { NewsletterForm } from '@/components/NewsletterForm'
import type { Locale } from '@/i18n/routing'

// The home page (its FollowBand carries the same form, spec §4.3) and the two pages where a sign-up form would sit under
// "you unsubscribed" or the thank-you. /bulten/gecersiz keeps the strip: that page points the reader at it.
const HIDDEN_ON = ['/', '/bulten/cikis', '/bulten/tesekkurler']

/** Above the footer on every page except HIDDEN_ON. */
export function NewsletterStrip({ locale }: { locale: Locale }) {
  const t = useTranslations('forms')
  const pathname = usePathname() // unprefixed: '/' for both /  and /en
  if (HIDDEN_ON.includes(pathname)) return null
  return (
    <section id="bulten-kayit" className="border-t border-line bg-bg-2">
      <div className="mx-auto max-w-6xl px-4 py-10 md:flex md:items-start md:justify-between md:gap-8">
        <div className="max-w-md">
          <h2>{t('newsletterTitle')}</h2>
          <p className="mt-2 text-fg-2">{t('newsletterText')}</p>
        </div>
        <div className="mt-6 md:mt-0 md:w-[28rem]">
          <NewsletterForm locale={locale} />
        </div>
      </div>
    </section>
  )
}
