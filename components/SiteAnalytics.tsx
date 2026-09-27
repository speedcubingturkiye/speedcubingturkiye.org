// components/SiteAnalytics.tsx
'use client'

import { Analytics, type BeforeSend } from '@vercel/analytics/next'

// The unsubscribe page is opened as /bulten/cikis?t=<token> and Vercel stores an event's URL with its query string, so the
// token (an encrypted address) is removed before any event leaves the browser. An unparseable URL drops the event: with
// no way to tell what it holds, sending it is the riskier choice. Defined here, not in the layout: a Server Component
// cannot pass a function to a Client Component.
const beforeSend: BeforeSend = (event) => {
  try {
    const url = new URL(event.url, window.location.href)
    if (!url.searchParams.has('t')) return event
    url.searchParams.delete('t')
    return { ...event, url: url.toString() }
  } catch {
    return null
  }
}

/** Vercel Web Analytics as the layout used it, plus the token guard above. */
export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />
}
