// components/SiteAnalytics.tsx
'use client'

import { Analytics, type BeforeSend } from '@vercel/analytics/next'

// Tokens ride in some addresses: ?t= (Hesabım, the confirm and unsubscribe links), ?w= (WCA ile kaydol) and ?b= (the
// membership link's newsletter part; the last two since 2026-10-22). Vercel stores an event's URL with its query string,
// so they are removed before any event leaves the browser. An unparseable URL drops the event: with no way to tell what
// it holds, sending it is the riskier choice. Defined here, not in the layout: a Server Component cannot pass a
// function to a Client Component.
const TOKEN_PARAMS = ['t', 'w', 'b']
const beforeSend: BeforeSend = (event) => {
  try {
    const url = new URL(event.url, window.location.href)
    if (!TOKEN_PARAMS.some((p) => url.searchParams.has(p))) return event
    for (const p of TOKEN_PARAMS) url.searchParams.delete(p)
    return { ...event, url: url.toString() }
  } catch {
    return null
  }
}

/** Vercel Web Analytics as the layout used it, plus the token guard above. */
export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />
}
