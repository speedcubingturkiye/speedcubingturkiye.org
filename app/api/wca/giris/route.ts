// app/api/wca/giris/route.ts: Hesabım's "WCA ile giriş" button (2026-10-22): out to the WCA login for the WCA ID alone,
// with the state cookie. Its return (donus) opens Hesabım for the member whose verified WCA ID comes back. From the
// site's own pages only (fromThisSite).
import { NextResponse, type NextRequest } from 'next/server'
import { FLOW_COOKIE, FLOW_COOKIE_OPTIONS, fromThisSite, startWcaLogin } from '@/lib/wca-link'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const locale = form.get('locale') === 'en' ? 'en' : 'tr'
  const flow = fromThisSite(request.headers) ? startWcaLogin(locale) : null
  if (!flow) return NextResponse.redirect(new URL(`${locale === 'en' ? '/en' : ''}/hesabim?durum=wca-hata`, request.url), 303)
  const res = NextResponse.redirect(flow.url, 303)
  res.cookies.set(FLOW_COOKIE, flow.cookie, FLOW_COOKIE_OPTIONS)
  return res
}
