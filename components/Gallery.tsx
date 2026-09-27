import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'

export async function Gallery({ images }: { images: { src: string; alt: string; caption?: string }[] }) {
  const t = await getTranslations('common')
  return (
    <section className="mt-6" aria-label={t('galleryTitle')}>
      {images.length === 0 ? (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex aspect-square items-center justify-center bg-bg-2">
                <div className="h-12 w-12 opacity-20">
                  {/* Inverted logo in dark mode: the kit's variant for dark grounds, as in the header and footer */}
                  <Logo variant="mark" className="h-full w-full object-contain dark:hidden" />
                  <Logo variant="mark" tone="inverted" className="hidden h-full w-full object-contain dark:block" />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-fg-2">{t('galleryEmpty')}</p>
        </>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((img) => (
            <li key={img.src} className="bg-bg-2">
              <figure>
                <div className="relative aspect-square overflow-hidden">
                  <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
                </div>
                {img.caption && <figcaption className="px-3 py-2 text-sm text-fg-2">{img.caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
