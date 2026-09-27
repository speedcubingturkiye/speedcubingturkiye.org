// lib/wca/client.ts
export const WCA_BASE = 'https://www.worldcubeassociation.org'
// The rankings endpoint sits behind a WAF rule that 403s default UAs (curl, node, undici). This exact UA is verified to pass.
export const WCA_UA = 'Mozilla/5.0 (compatible; SpeedcubingTurkiye/1.0; +https://speedcubingturkiye.org)'

/**
 * GET WCA_BASE+path with the project UA and Next data-cache revalidation.
 * 404 → console.error + null (the resource does not exist). Any other non-2xx (429, 5xx, WAF 403) or a network/JSON
 * error → console.error + throw, so the render fails and ISR keeps serving the last good page (spec §6) and an
 * on-demand render becomes an uncached 500 instead of a cached "no data" page or 404. During `next build` there is no
 * previous page to keep, so it returns null instead and the first build still renders DataUnavailable.
 */
export async function wcaFetchWithHeaders<T>(
  path: string,
  revalidate: number,
): Promise<{ data: T; link: string | null } | null> {
  let error: string
  try {
    const res = await fetch(WCA_BASE + path, {
      headers: { 'User-Agent': WCA_UA, Accept: 'application/json' },
      next: { revalidate },
    })
    if (res.ok) return { data: (await res.json()) as T, link: res.headers.get('link') }
    error = `WCA ${res.status} ${path}`
    if (res.status === 404) {
      console.error(error)
      return null
    }
  } catch (err) {
    error = `WCA fetch failed ${path}: ${String(err)}`
  }
  console.error(error)
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  throw new Error(error)
}

export async function wcaFetch<T>(path: string, revalidate: number): Promise<T | null> {
  const res = await wcaFetchWithHeaders<T>(path, revalidate)
  return res ? res.data : null
}

/** Runs fn over items in batches of `limit`, waiting `gapMs` between batches (WCA 429s at ~40 rapid requests). */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  gapMs = 300,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    if (i > 0) await new Promise((r) => setTimeout(r, gapMs))
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))))
  }
  return out
}
