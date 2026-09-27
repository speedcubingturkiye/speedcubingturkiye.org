import type { MetadataRoute } from 'next'
import { site } from '@/site.config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/bulten/', '/en/bulten/', '/keystatic'] },
    sitemap: `${site.url}/sitemap.xml`,
  }
}
