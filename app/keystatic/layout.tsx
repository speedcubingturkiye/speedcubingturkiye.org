// app/keystatic/layout.tsx: the editor's own root layout. There is no app/layout.tsx: app/[locale]/layout.tsx is the
// site's root and this one is the panel's, so the panel gets no site chrome, fonts or analytics. noindex here plus
// Disallow in app/robots.ts (spec §6).
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'İçerik editörü', robots: { index: false, follow: false } }

export default function KeystaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
