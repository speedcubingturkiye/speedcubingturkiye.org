// lib/metadata.ts
import type { Metadata } from 'next'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/** Title/description + canonical + hreflang (tr, en, x-default) + OG for one localized page. Relative URLs resolve against metadataBase set in the root layout. */
export function pageMeta(locale: Locale, href: string, meta: { title: string; description: string }): Metadata {
  const tr = getPathname({ locale: 'tr', href })
  const en = getPathname({ locale: 'en', href })
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: locale === 'tr' ? tr : en,
      languages: { tr, en, 'x-default': tr },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: locale === 'tr' ? tr : en,
      siteName: 'Speedcubing Türkiye',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
      images: ['/og.png'],
    },
    twitter: { card: 'summary_large_image' },
  }
}
