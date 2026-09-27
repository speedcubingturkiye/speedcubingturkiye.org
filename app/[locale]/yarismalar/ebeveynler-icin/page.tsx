import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { competitionsSectionNav } from '@/lib/section-nav'
import { MdxPage } from '@/components/MdxPage'
import { SectionNav } from '@/components/SectionNav'

const SLUG = 'yarismalar/ebeveynler-icin'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getLocale(), SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  return <MdxPage locale={locale} slug={SLUG} sectionNav={<SectionNav items={await competitionsSectionNav()} />} />
}
