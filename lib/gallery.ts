// lib/gallery.ts: content/gallery.json (spec §3.7): photos the panel uploads to public/galeri. Validated on import.
import type { Locale } from '@/i18n/routing'
import raw from '@/content/gallery.json'
import { GALLERY_PREFIX, isRecord, text } from '@/lib/content-rules'

export type GalleryEntry = { image: string; captionTr?: string; captionEn?: string; altTr?: string; altEn?: string }
export type GalleryImage = { src: string; alt: string; caption?: string }
export const GALLERY_FILE = 'content/gallery.json'

export function parseGallery(raw: unknown, file = GALLERY_FILE): GalleryEntry[] {
  const list = isRecord(raw) ? raw.images : undefined
  if (!Array.isArray(list)) throw new Error(`${file}: "images" anahtarı altında bir liste bekleniyor`)
  return list.map((item, i) => {
    if (!isRecord(item)) throw new Error(`${file}: fotoğraf ${i + 1}: alanlar eksik`)
    const image = text(item.image)
    if (!image.startsWith(GALLERY_PREFIX)) throw new Error(`${file}: fotoğraf ${i + 1}: "image" "${GALLERY_PREFIX}" ile başlamalı ("${image}")`)
    const [captionTr, captionEn, altTr, altEn] = [item.captionTr, item.captionEn, item.altTr, item.altEn].map(text)
    return {
      image,
      ...(captionTr ? { captionTr } : {}),
      ...(captionEn ? { captionEn } : {}),
      ...(altTr ? { altTr } : {}),
      ...(altEn ? { altEn } : {}),
    }
  })
}

const ENTRIES = parseGallery(raw)

/**
 * The medya page's gallery; an empty list shows the logo placeholders (components/Gallery.tsx). Each language takes its
 * own caption and alt text; no alt text in that language = decorative (alt="").
 */
export function listGalleryImages(locale: Locale, entries = ENTRIES): GalleryImage[] {
  return entries.map((g) => ({
    src: g.image,
    alt: (locale === 'tr' ? g.altTr : g.altEn) ?? '',
    caption: locale === 'tr' ? g.captionTr : g.captionEn,
  }))
}
