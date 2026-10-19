import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { MdxBody } from '@/components/MdxPage'

const SLUG = 'yarismalar/ebeveynler-icin'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getLocale(), SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  return (
    <div className="max-w-3xl">
      <MdxBody locale={locale} slug={SLUG} />
    </div>
  )
}
