// components/InlineScript.tsx
'use client'

/**
 * A script that runs while the server HTML is parsed. When React renders it on the client (a language switch remounts
 * the root layout) it is inert text, so React does not warn about a <script> it cannot run. Pattern from
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md, "Extracting a reusable component".
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
