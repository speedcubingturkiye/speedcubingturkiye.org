// app/[locale]/bulten/onizleme/[slug]/route.ts: a news entry's newsletter mail as a page (spec §6.6): what the
// reviewers check before approving. No login: the news is public and the mail holds nothing more.
import { newsHash, readNewsForMail } from '@/lib/news'
import { renderNewsletter } from '@/lib/newsletter-send'
import { site } from '@/site.config'

export async function GET(_request: Request, ctx: RouteContext<'/[locale]/bulten/onizleme/[slug]'>) {
  const { locale: raw, slug } = await ctx.params
  const locale = raw === 'en' ? 'en' : 'tr'
  const [news, hash] = await Promise.all([readNewsForMail(slug), newsHash(slug)])
  if (!news || !hash) return new Response('Not found', { status: 404, headers: { 'x-robots-tag': 'noindex' } })
  const mail = renderNewsletter(news, locale, `${site.url}${locale === 'en' ? '/en' : ''}/bulten/cikis`)
  // x-news-hash: the fingerprint of the files this page shows; the find job waits for this header to show the hash
  // before it asks for approval, and the send route checks the hash again.
  return new Response(mail.html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'x-news-hash': hash },
  })
}
