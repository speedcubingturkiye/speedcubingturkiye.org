import type { ReactNode } from 'react'
import { organizationSectionNav } from '@/lib/section-nav'
import { SectionNav } from '@/components/SectionNav'

/**
 * The five Bilgi pages (the header's Bilgi menu) share their tabs here, above each page's title: the tabs sit in the
 * same place on every page whatever the title and description below them, and stay mounted while the pages change.
 * The route group leaves the URLs as they are.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <SectionNav items={await organizationSectionNav()} />
      </div>
      {children}
    </>
  )
}
