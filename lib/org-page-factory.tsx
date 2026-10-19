import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { MdxBody } from '@/components/MdxPage'

export function createOrgPageFactory(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    return pageMetadata(await getLocale(), slug)
  }

  async function Page() {
    const locale = await getLocale()
    // The section layout draws the title, the lead and the last update (SectionHeader)
    return <MdxBody locale={locale} slug={slug} />
  }

  return { generateMetadata, Page }
}
