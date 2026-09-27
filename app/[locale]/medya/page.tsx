// app/[locale]/medya/page.tsx
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { pageMetadata } from '@/lib/content'
import { listGalleryImages } from '@/lib/gallery'
import { MdxPage } from '@/components/MdxPage'
import { Gallery } from '@/components/Gallery'

const SLUG = 'medya'

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getLocale(), SLUG)
}

export default async function Page() {
  const locale = await getLocale()
  return (
    <MdxPage locale={locale} slug={SLUG}>
      <Gallery images={listGalleryImages(locale)} />
    </MdxPage>
  )
}
