// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  // X-Powered-By: Next.js tells a visitor nothing they need (2026-10-22)
  poweredByHeader: false,
  // lib/wca/rankings.ts reads data/rankings with fs at request time; tracing cannot see those paths by itself.
  outputFileTracingIncludes: {
    '/\\[locale\\]/siralamalar': ['./data/rankings/**/*'],
    '/\\[locale\\]/siralamalar/**/*': ['./data/rankings/**/*'],
    // The newsletter preview and the send route read news files at request time through the Keystatic reader.
    '/\\[locale\\]/bulten/onizleme/**/*': ['./content/news/**/*'],
    '/api/bulten/gonder': ['./content/news/**/*'],
  },
  // 2026-10-22: no other site may frame a page (clickjacking on Hesabım's forms), no file is read as another type, and
  // a link to another site carries the origin alone. HSTS comes from Vercel (max-age=63072000).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/wca',
        destination: 'https://www.worldcubeassociation.org/competitions?region=Turkey',
        permanent: false, // 307
      },
    ]
  },
  async rewrites() {
    return {
      // The proxy matcher skips any path with a dot, so the unprefixed TR RSS URL never
      // reaches [locale] on its own; rewrite it to the tr-prefixed route before that.
      beforeFiles: [{ source: '/haberler/rss.xml', destination: '/tr/haberler/rss.xml' }],
    }
  },
}

export default createNextIntlPlugin()(nextConfig)
