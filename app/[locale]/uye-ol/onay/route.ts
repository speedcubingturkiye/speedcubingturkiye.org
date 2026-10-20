// app/[locale]/uye-ol/onay/route.ts: the confirm link in the membership mail (spec 2026-10-19 §3). It confirms on
// open, as the newsletter's does, and lands on /uye-ol with the result.
import type { NextRequest } from 'next/server'
import { confirmMembership } from '@/lib/membership'
import { clientIp, confirmSubscription } from '@/lib/newsletter'

export async function GET(request: NextRequest, ctx: RouteContext<'/[locale]/uye-ol/onay'>) {
  const { locale } = await ctx.params
  const prefix = locale === 'en' ? '/en' : ''
  const params = request.nextUrl.searchParams
  const ok = await confirmMembership(params.get('t') ?? '')
  // The newsletter box's token (spec 2026-10-20 §A): the same click starts the subscription, with the newsletter form's
  // double opt-in record. Only after the membership, and a failure there never changes where the visitor lands.
  const newsletterToken = params.get('b')
  if (ok && newsletterToken) await confirmSubscription(newsletterToken, clientIp(request.headers)).catch(() => false)
  return Response.redirect(new URL(`${prefix}/uye-ol?durum=${ok ? 'onaylandi' : 'gecersiz'}`, request.url), 303)
}
