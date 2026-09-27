// app/api/bulten/cikis/route.ts: one-click unsubscribe (RFC 8058) behind every mailing's List-Unsubscribe header.
import type { NextRequest } from 'next/server'
import { cancelSubscription } from '@/lib/newsletter'
import { readToken } from '@/lib/newsletter-token'

export async function POST(request: NextRequest) {
  const ok = await cancelSubscription(request.nextUrl.searchParams.get('t') ?? '')
  return new Response(null, { status: ok ? 200 : 400 })
}

// A client that opens the header's address in a browser gets the page with the button, in the subscriber's language.
// A misconfigured secret throws here as it does on the page: that is not an invalid link.
export function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t') ?? ''
  const prefix = readToken('cikis', t)?.locale === 'en' ? '/en' : ''
  return Response.redirect(new URL(`${prefix}/bulten/cikis?t=${encodeURIComponent(t)}`, request.url), 303)
}
