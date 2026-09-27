// lib/newsletter-send.ts: manual newsletters (spec §6.6): a news entry marked "Bültenle gönder" as a mail, its
// preview, and the send that the approved GitHub workflow triggers.
import type { Locale } from '@/i18n/routing'
import { renderNewsMail, type RenderedMail } from '@/lib/mail-render'
import { SLUG_RE } from '@/lib/content-rules'
import { newsHash, readNewsForMail, type NewsForMail } from '@/lib/news'
import { mailSubscribers } from '@/lib/newsletter'
import { claimNewsletter, finishNewsletter, type Claim } from '@/lib/newsletter-log'
import { site } from '@/site.config'

/** A news entry's mail in one language; read-more goes to the news page (live: the workflow waits for the deploy). */
export function renderNewsletter(news: NewsForMail, locale: Locale, unsubscribeUrl: string): RenderedMail {
  return renderNewsMail({
    locale,
    title: news.title[locale],
    description: news.description[locale],
    source: news.body[locale],
    readMoreUrl: `${site.url}${locale === 'en' ? '/en' : ''}/haberler/${news.slug}`,
    unsubscribeUrl,
  })
}

export type SendResult = { status: number; body: Record<string, unknown> }

/** POST /api/bulten/gonder after the route checked the key and the kill switch (spec §6.6 step 4). `hash` is the content
 *  hash the reviewers approved (newsHash, printed by scripts/pending-newsletters.ts). */
export async function sendNewsletter(slug: string, hash: string, now = Date.now()): Promise<SendResult> {
  // A manual newsletter goes out only from the deployed site, through the approved workflow (next dev may hold production keys).
  if (process.env.NODE_ENV === 'development') return { status: 503, body: { error: 'development' } }
  if (!SLUG_RE.test(slug)) return { status: 400, body: { error: 'slug' } }
  if (!/^[0-9a-f]{64}$/.test(hash)) return { status: 400, body: { error: 'hash' } }
  const news = await readNewsForMail(slug)
  if (!news || !news.bulten || news.auto) return { status: 404, body: { error: 'not_found' } }
  // The approval covers this content: an edit deployed since then waits for its own approval, before anything is claimed.
  if ((await newsHash(slug)) !== hash) return { status: 409, body: { error: 'changed' } }
  const claim = await claimNewsletter(slug, now).catch((e: unknown): Claim => {
    console.error('newsletter claim failed:', slug, e instanceof Error ? e.name : String(e))
    return { ok: false, reason: 'error' }
  })
  if (!claim.ok) {
    const status = claim.reason === 'daily_limit' ? 429 : claim.reason === 'error' ? 500 : 409
    return { status, body: { error: claim.reason } }
  }
  const report = await mailSubscribers((locale, links) => renderNewsletter(news, locale, links.page)).catch((e: unknown) => {
    console.error('newsletter send failed:', slug, e instanceof Error ? e.name : String(e))
    return null
  })
  // The start entry stays: a broken-off mailing is never retried, so nobody gets it twice.
  if (!report) return { status: 500, body: { error: 'send_failed' } }
  // The mails went out: a failed ledger update must not turn that into an error (the start entry already blocks a resend).
  const logged = await finishNewsletter(slug, report).catch((e: unknown) => {
    console.error('newsletter log failed:', slug, e instanceof Error ? e.name : String(e))
    return false
  })
  return { status: 200, body: { slug, ...report, logged } }
}
