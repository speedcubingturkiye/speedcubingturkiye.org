import type { ReactNode } from 'react'
import { getLocale } from 'next-intl/server'
import { competitionsSection } from '@/lib/section-nav'
import { SectionHeader } from '@/components/SectionHeader'

/**
 * The four Yarışmalar pages (the header's Yarışmalar menu) share one frame here, as the Bilgi pages do: the same width,
 * and a header whose title and tabs keep their place from page to page (SectionHeader). Each page brings only its
 * content. The calendar's width (6xl, which its rows need); the guides keep their reading width inside it, under the
 * title. The route group leaves the URLs as they are and keeps the competition pages (/yarismalar/[id]) out.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <SectionHeader pages={await competitionsSection(await getLocale())} />
      <div className="mt-8">{children}</div>
    </div>
  )
}
