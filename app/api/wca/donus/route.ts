// app/api/wca/donus/route.ts: the WCA login's return (spec 2026-10-21) for the three flows: WCA bağlama, WCA ile kaydol
// and WCA ile giriş (2026-10-22).
// The state cookie is read and cleared whatever the outcome.
import { NextResponse, type NextRequest } from 'next/server'
import { finishWcaLink, FLOW_COOKIE, FLOW_COOKIE_OPTIONS } from '@/lib/wca-link'

// The WCA's two calls, then the members sheet's script (lib/membership-sheet.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const path = await finishWcaLink(request.cookies.get(FLOW_COOKIE)?.value, request.nextUrl.searchParams)
  const res = NextResponse.redirect(new URL(path, request.url), 303)
  res.cookies.set(FLOW_COOKIE, '', { ...FLOW_COOKIE_OPTIONS, maxAge: 0 })
  return res
}
