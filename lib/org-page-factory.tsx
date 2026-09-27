import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { organizationSectionNav } from '@/lib/section-nav'
import { MdxPage } from '@/components/MdxPage'
import { SectionNav } from '@/components/SectionNav'

export function createOrgPageFactory(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    return pageMetadata(await getLocale(), slug)
  }

  async function Page() {
    const locale = await getLocale()
    return <MdxPage locale={locale} slug={slug} sectionNav={<SectionNav items={await organizationSectionNav()} />} />
  }

  return { generateMetadata, Page }
}
