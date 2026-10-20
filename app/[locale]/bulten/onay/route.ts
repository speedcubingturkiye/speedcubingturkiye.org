// app/[locale]/bulten/onay/route.ts: the confirm link in the double opt-in mail (spec §6.3). It confirms on open (the
// user's decision) and lands on the thank-you page, or on /bulten/gecersiz when the link no longer works.
import type { NextRequest } from 'next/server'
import { clientIp, confirmSubscription } from '@/lib/newsletter'

export async function GET(request: NextRequest, ctx: RouteContext<'/[locale]/bulten/onay'>) {
  const { locale } = await ctx.params
  const prefix = locale === 'en' ? '/en' : ''
  const ok = await confirmSubscription(request.nextUrl.searchParams.get('t') ?? '', clientIp(request.headers))
  return Response.redirect(new URL(`${prefix}/bulten/${ok ? 'tesekkurler' : 'gecersiz'}`, request.url), 303)
}
