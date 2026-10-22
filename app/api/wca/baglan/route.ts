// app/api/wca/baglan/route.ts: Hesabım's "WCA hesabını bağla" form (spec 2026-10-21, Parça 2): out to the WCA login
// with the state cookie. A form POST, so the page's token stays out of addresses and logs; from the site's own pages
// only (fromThisSite, 2026-10-22).
import { NextResponse, type NextRequest } from 'next/server'
import { readAccountToken } from '@/lib/account'
import { backToAccount, FLOW_COOKIE, FLOW_COOKIE_OPTIONS, fromThisSite, startWcaLink } from '@/lib/wca-link'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const data = fromThisSite(request.headers) ? readAccountToken(String(form.get('t') ?? '')) : null
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303)
  if (!data) return to(`${form.get('locale') === 'en' ? '/en' : ''}/hesabim?durum=gecersiz`)
  const flow = startWcaLink(data)
  if (!flow) return to(backToAccount(data, 'wca-hata'))
  const res = NextResponse.redirect(flow.url, 303)
  res.cookies.set(FLOW_COOKIE, flow.cookie, FLOW_COOKIE_OPTIONS)
  return res
}
