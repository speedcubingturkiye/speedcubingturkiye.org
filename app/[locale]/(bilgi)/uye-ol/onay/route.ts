// app/[locale]/(bilgi)/uye-ol/onay/route.ts: the confirm link in the membership mail (spec 2026-10-19 §3). It confirms on
// open, as the newsletter's does, and lands on /uye-ol with the result.
import type { NextRequest } from 'next/server'
import { confirmMembership } from '@/lib/membership'

export async function GET(request: NextRequest, ctx: RouteContext<'/[locale]/uye-ol/onay'>) {
  const { locale } = await ctx.params
  const prefix = locale === 'en' ? '/en' : ''
  const ok = await confirmMembership(request.nextUrl.searchParams.get('t') ?? '')
  return Response.redirect(new URL(`${prefix}/uye-ol?durum=${ok ? 'onaylandi' : 'gecersiz'}`, request.url), 303)
}
