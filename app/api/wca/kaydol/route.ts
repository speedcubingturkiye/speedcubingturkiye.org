// app/api/wca/kaydol/route.ts: Üye ol's "WCA ile kaydol" button (spec 2026-10-21, WCA ile kaydol): out to the WCA login
// for the profile, the email and the date of birth, with the state cookie. Its return (donus) fills the sign-up form.
import { NextResponse, type NextRequest } from 'next/server'
import { FLOW_COOKIE, FLOW_COOKIE_OPTIONS, startWcaSignup } from '@/lib/wca-link'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const locale = form.get('locale') === 'en' ? 'en' : 'tr'
  const flow = startWcaSignup(locale)
  if (!flow) return NextResponse.redirect(new URL(`${locale === 'en' ? '/en' : ''}/uye-ol?durum=wca-hata`, request.url), 303)
  const res = NextResponse.redirect(flow.url, 303)
  res.cookies.set(FLOW_COOKIE, flow.cookie, FLOW_COOKIE_OPTIONS)
  return res
}
