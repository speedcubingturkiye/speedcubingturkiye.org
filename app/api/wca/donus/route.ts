// app/api/wca/donus/route.ts: the WCA login's return (spec 2026-10-21) for both flows, WCA bağlama and WCA ile kaydol.
// The state cookie is read and cleared whatever the outcome.
import { NextResponse, type NextRequest } from 'next/server'
import { finishWcaLink, FLOW_COOKIE, FLOW_COOKIE_OPTIONS } from '@/lib/wca-link'

export async function GET(request: NextRequest) {
  const path = await finishWcaLink(request.cookies.get(FLOW_COOKIE)?.value, request.nextUrl.searchParams)
  const res = NextResponse.redirect(new URL(path, request.url), 303)
  res.cookies.set(FLOW_COOKIE, '', { ...FLOW_COOKIE_OPTIONS, maxAge: 0 })
  return res
}
