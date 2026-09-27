// app/[locale]/live/route.ts
// GET /live and /en/live → WCA Live page of the ongoing/next competition if it is imported there,
// else the competition's WCA page, else WCA Live's home. Cached for 5 minutes.
// Do NOT read `request` here (url/headers/cookies): that would make the route dynamic and disable the cache.
import { NextResponse } from 'next/server'
import { WCA_UA } from '@/lib/wca/client'
import { getNextCompetition } from '@/lib/wca/competitions'

export const revalidate = 300

const LIVE = 'https://live.worldcubeassociation.org'
const WCA_HOST = 'worldcubeassociation.org'

/** Absolute URL string, but only when its host is worldcubeassociation.org or a subdomain of it; else null. Never throws. */
function wcaUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base)
    return u.hostname === WCA_HOST || u.hostname.endsWith(`.${WCA_HOST}`) ? u.toString() : null
  } catch {
    return null
  }
}

export async function GET() {
  // A WCA failure during a cache miss must not 500: fall back to the WCA Live home page (spec §10).
  const comp = (await getNextCompetition().catch(() => null))?.comp
  if (!comp) return NextResponse.redirect(LIVE, 307)

  const link = `${LIVE}/link/competitions/${comp.id}`
  let live: string | null = null
  try {
    const res = await fetch(link, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': WCA_UA } })
    const location = res.headers.get('location')
    if (res.status === 302 && location) live = wcaUrl(location, link)
  } catch (err) {
    console.error('WCA Live HEAD failed', err)
  }
  // Redirect only to a WCA host: the Location header and comp.url come from WCA but are not validated before this
  // point. Order (spec §10): the WCA Live page, else the competition's WCA page (also when the HEAD failed), else the
  // WCA Live home. wcaUrl never throws, so bad data falls through instead of a 500.
  return NextResponse.redirect(live ?? wcaUrl(comp.url) ?? LIVE, 307)
}
