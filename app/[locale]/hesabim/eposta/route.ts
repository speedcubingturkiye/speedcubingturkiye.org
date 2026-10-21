// app/[locale]/hesabim/eposta/route.ts: the link mailed to a new address (spec 2026-10-21). It changes the membership's
// address on open, as the confirm links do, and lands on Hesabım with the outcome.
import type { NextRequest } from 'next/server'
import { confirmEmailChange } from '@/lib/account'
import { clientIp } from '@/lib/newsletter'

const DURUM = { ok: 'eposta-degisti', taken: 'eposta-kullanimda', invalid: 'gecersiz', error: 'hata' } as const

export async function GET(request: NextRequest, ctx: RouteContext<'/[locale]/hesabim/eposta'>) {
  const { locale } = await ctx.params
  const prefix = locale === 'en' ? '/en' : ''
  // The IP joins the double opt-in record of a newsletter subscription that follows the change
  const result = await confirmEmailChange(request.nextUrl.searchParams.get('t') ?? '', clientIp(request.headers))
  return Response.redirect(new URL(`${prefix}/hesabim?durum=${DURUM[result]}`, request.url), 303)
}
