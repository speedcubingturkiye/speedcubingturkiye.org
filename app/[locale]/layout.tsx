// app/[locale]/layout.tsx: the ROOT layout (there is no app/layout.tsx)
import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import { ViewTransition } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { site } from '@/site.config'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { InlineScript } from '@/components/InlineScript'
import { NewsletterStrip } from '@/components/NewsletterStrip'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { SkipLink } from '@/components/SkipLink'
import { LOCALE_SCRIPT, THEME_SCRIPT } from '@/lib/head-scripts'
import '@cubing/icons/css'
import '@/app/globals.css'

// One family (spec §3.2): variable weight plus the width axis for the wide-cut headings (font-stretch 110–125%).
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'], // latin-ext = ş ğ ı İ ö ü ç
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common')
  return {
    metadataBase: new URL(site.url),
    title: { default: site.name, template: `%s · ${site.name}` },
    description: t('tagline'),
    openGraph: { siteName: site.name, type: 'website', images: ['/og.png'] },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale() // triggers i18n/request.ts → hasLocale → notFound() for unknown locales
  return (
    // suppressHydrationWarning: THEME_SCRIPT adds data-theme to <html> before React hydrates it
    // data-scroll-behavior: Next turns the CSS smooth scrolling off during route changes, so a new page starts at the
    // top at once; in-page anchors still scroll smoothly (node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth" className={`${archivo.variable} antialiased`}>
      {/* spec §3.4: in <head>, before anything paints (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md, "Themes").
          The language first: when it sends the visitor to the other language, nothing else needs to run
          (lib/head-scripts.ts; localStorage only, no cookie). They only run when the browser parses server HTML;
          ThemeToggle applies the theme's rule when React renders <html>. */}
      <head>
        <InlineScript html={LOCALE_SCRIPT} />
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="bg-bg font-sans text-fg">
        {/* The locale is this layout's segment, so a language switch remounts everything below it: the old and the new
            "page" form a shared pair and the whole page crossfades between the two languages. Other navigations keep
            the layout, and default="none" leaves them unanimated. */}
        <ViewTransition name="page" share="auto" default="none">
          <div className="flex min-h-screen flex-col">
            <NextIntlClientProvider>
              <SkipLink />
              <Header />
              <main id="main" className="flex-1">
                {children}
              </main>
              <NewsletterStrip locale={locale} />
              <Footer />
            </NextIntlClientProvider>
          </div>
        </ViewTransition>
        <SiteAnalytics />
      </body>
    </html>
  )
}
