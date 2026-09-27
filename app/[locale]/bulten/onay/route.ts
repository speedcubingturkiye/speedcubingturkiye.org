// app/[locale]/bulten/onay/route.ts: the confirm link in the double opt-in mail (spec §6.3). It confirms on open (the
// user's decision) and lands on the thank-you page, or on /bulten/gecersiz when the link no longer works.
import type { NextRequest } from 'next/server'
import { confirmSubscription } from '@/lib/newsletter'

export async function GET(request: NextRequest, ctx: RouteContext<'/[locale]/bulten/onay'>) {
  const { locale } = await ctx.params
  const prefix = locale === 'en' ? '/en' : ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
  const ok = await confirmSubscription(request.nextUrl.searchParams.get('t') ?? '', ip)
  return Response.redirect(new URL(`${prefix}/bulten/${ok ? 'tesekkurler' : 'gecersiz'}`, request.url), 303)
}
