// app/[locale]/cerez-politikasi/page.tsx
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { MdxPage } from '@/components/MdxPage'

const SLUG = 'cerez-politikasi'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getLocale(), SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  return <MdxPage locale={locale} slug={SLUG} />
}
