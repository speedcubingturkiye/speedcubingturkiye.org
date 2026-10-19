import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { MdxPage } from '@/components/MdxPage'

export function createOrgPageFactory(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    return pageMetadata(await getLocale(), slug)
  }

  async function Page() {
    const locale = await getLocale()
    return <MdxPage locale={locale} slug={slug} />
  }

  return { generateMetadata, Page }
}
