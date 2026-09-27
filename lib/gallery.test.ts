// lib/gallery.test.ts
import { describe, expect, it } from 'vitest'
import { listGalleryImages, parseGallery } from '@/lib/gallery'

describe('parseGallery', () => {
  it('keeps image, captions and alt texts per language; drops empty strings', () => {
    const images = [
      { image: '/galeri/a.jpg', captionTr: 'Podyum', captionEn: '', altTr: 'Podyumda üç yarışmacı', altEn: ' ' },
      { image: '/galeri/b.jpg', altEn: 'Timer on a mat' },
    ]
    expect(parseGallery({ images }, 'g.json')).toEqual([
      { image: '/galeri/a.jpg', captionTr: 'Podyum', altTr: 'Podyumda üç yarışmacı' },
      { image: '/galeri/b.jpg', altEn: 'Timer on a mat' },
    ])
    expect(parseGallery({ images: [] }, 'g.json')).toEqual([])
  })

  it('rejects a bad list or path naming the file and the photo', () => {
    expect(() => parseGallery([], 'content/gallery.json')).toThrow('content/gallery.json: "images" anahtarı altında bir liste bekleniyor')
    expect(() => parseGallery({ images: [{ image: 'a.jpg' }] }, 'g.json')).toThrow('g.json: fotoğraf 1: "image" "/galeri/" ile başlamalı')
    expect(() => parseGallery({ images: ['x'] }, 'g.json')).toThrow('fotoğraf 1: alanlar eksik')
  })
})

describe('listGalleryImages', () => {
  const entries = parseGallery(
    {
      images: [
        { image: '/galeri/a.jpg', captionTr: 'Podyum', captionEn: 'Podium', altTr: 'Podyumda üç yarışmacı', altEn: 'Three competitors on the podium' },
        { image: '/galeri/b.jpg', captionTr: 'Salon', altTr: 'Yarışma salonu' },
      ],
    },
    'g.json',
  )

  it('gives each language its own caption and alt text; no alt text in that language means decorative ("")', () => {
    expect(listGalleryImages('tr', entries)).toEqual([
      { src: '/galeri/a.jpg', alt: 'Podyumda üç yarışmacı', caption: 'Podyum' },
      { src: '/galeri/b.jpg', alt: 'Yarışma salonu', caption: 'Salon' },
    ])
    expect(listGalleryImages('en', entries)).toEqual([
      { src: '/galeri/a.jpg', alt: 'Three competitors on the podium', caption: 'Podium' },
      { src: '/galeri/b.jpg', alt: '', caption: undefined },
    ])
  })
})
