// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  // lib/wca/rankings.ts reads data/rankings with fs at request time; tracing cannot see those paths by itself.
  outputFileTracingIncludes: {
    '/\\[locale\\]/siralamalar': ['./data/rankings/**/*'],
    '/\\[locale\\]/siralamalar/**/*': ['./data/rankings/**/*'],
    // The newsletter preview and the send route read news files at request time through the Keystatic reader.
    '/\\[locale\\]/bulten/onizleme/**/*': ['./content/news/**/*'],
    '/api/bulten/gonder': ['./content/news/**/*'],
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
