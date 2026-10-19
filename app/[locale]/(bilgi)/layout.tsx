import type { ReactNode } from 'react'
import { getLocale } from 'next-intl/server'
import { organizationSection } from '@/lib/section-nav'
import { SectionHeader } from '@/components/SectionHeader'

/**
 * The five Bilgi pages (the header's Bilgi menu) share one frame here: the same width, and a header whose title and
 * tabs keep their place from page to page (SectionHeader). Each page brings only its content. The route group leaves
 * the URLs as they are.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <SectionHeader pages={await organizationSection(await getLocale())} />
      <div className="mt-8">{children}</div>
    </div>
  )
}
