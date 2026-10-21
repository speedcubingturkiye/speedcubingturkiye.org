// app/api/wca/baglan/route.ts: Hesabım's "WCA hesabını bağla" form (spec 2026-10-21, Parça 2): out to the WCA login
// with the state cookie. A form POST, so the page's token stays out of addresses and logs.
import { NextResponse, type NextRequest } from 'next/server'
import { readAccountToken } from '@/lib/account'
import { backToAccount, FLOW_COOKIE, FLOW_MAX_AGE, FLOW_PATH, startWcaLink } from '@/lib/wca-link'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const data = readAccountToken(String(form.get('t') ?? ''))
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303)
  if (!data) return to(`${form.get('locale') === 'en' ? '/en' : ''}/hesabim?durum=gecersiz`)
  const flow = startWcaLink(data)
  if (!flow) return to(backToAccount(data, 'wca-hata'))
  const res = NextResponse.redirect(flow.url, 303)
  res.cookies.set(FLOW_COOKIE, flow.cookie, { httpOnly: true, secure: true, sameSite: 'lax', path: FLOW_PATH, maxAge: FLOW_MAX_AGE })
  return res
}
