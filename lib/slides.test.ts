// lib/slides.test.ts
import { describe, expect, it } from 'vitest'
import { getSlides, localizeSlide, parseSlides } from '@/lib/slides'

const brand = {
  discriminant: 'static',
  value: {
    id: 'brand',
    titleTr: 'Speedcubing Türkiye',
    titleEn: 'Speedcubing Türkiye',
    leadTr: 'Açıklama.',
    leadEn: 'Lead.',
    actions: [{ labelTr: 'Yarışmalar', labelEn: 'Competitions', href: '/yarismalar', variant: 'solid' }],
    layout: 'mark',
    focus: 'center',
  },
}
const next = { discriminant: 'next-competition' }
const photo = {
  discriminant: 'static',
  value: { ...brand.value, id: 'photo', image: '/images/slides/podyum.jpg', layout: 'A', focus: 'top', altTr: 'Podyum', altEn: 'Podium' },
}
const file = 'f.json'
const s = (...slides: unknown[]) => ({ slides })

describe('parseSlides', () => {
  it('accepts both slide types, defaults layout/focus and ignores unknown fields', () => {
    expect(parseSlides(s({ ...brand, value: { ...brand.value, layout: undefined, focus: undefined, extra: 1 } }, next, photo), file)).toEqual([
      { type: 'static', ...brand.value },
      { type: 'next-competition' },
      { type: 'static', ...photo.value },
    ])
  })

  it('accepts every photo layout with a photo and https:// buttons', () => {
    for (const layout of ['A', 'D', 'E', 'G', 'J']) {
      expect(parseSlides(s({ ...photo, value: { ...photo.value, layout } }), file)[0]).toMatchObject({ layout })
    }
    const wca = { labelTr: 'WCA', labelEn: 'WCA', href: 'https://www.worldcubeassociation.org/', variant: 'outline' }
    expect(parseSlides(s({ ...brand, value: { ...brand.value, actions: [wca] } }), file)[0]).toMatchObject({ actions: [wca] })
  })

  it('enforces the spec rules with the file and slide number in every message', () => {
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, layout: 'D' } }), 'content/home/slides.json')).toThrow(
      'content/home/slides.json: slayt 1: fotoğraf seçilmeden "D" yerleşimi kullanıyor',
    )
    for (const layout of ['A', 'E', 'G', 'J']) {
      expect(() => parseSlides(s({ ...brand, value: { ...brand.value, layout } }), file)).toThrow(`fotoğraf seçilmeden "${layout}" yerleşimi kullanıyor`)
    }
    expect(() => parseSlides(s(brand, { ...brand, value: { ...brand.value, id: 'b2', titleTr: 'x'.repeat(41) } }), file)).toThrow('slayt 2: "titleTr" 40 karakteri aşıyor')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, leadEn: 'y'.repeat(161) } }), file)).toThrow('"leadEn" 160 karakteri aşıyor')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, titleEn: '' } }), file)).toThrow('"titleEn" boş olamaz')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, actions: [{ ...brand.value.actions[0], href: 'http://wca.org' }] } }), file)).toThrow('"/" ile başlamalı ya da "https://"')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, actions: [{ ...brand.value.actions[0], variant: 'ghost' }] } }), file)).toThrow('"solid" ya da "outline"')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, actions: [] } }), file)).toThrow('en az bir düğme')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, actions: Array(3).fill(brand.value.actions[0]) } }), file)).toThrow('en fazla 2 düğme')
    expect(() => parseSlides(s({ ...photo, value: { ...photo.value, image: 'podyum.jpg' } }), file)).toThrow('"/images/slides/" ile başlamalı')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, layout: 'Z' } }), file)).toThrow('yerleşim "Z" tanınmıyor')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, focus: 'middle' } }), file)).toThrow('odak "middle" tanınmıyor')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, id: 'Brand' } }), file)).toThrow('"id" boş olamaz ve yalnız küçük harf')
    expect(() => parseSlides(s({ ...brand, value: { ...brand.value, id: 'next-competition' } }), file)).toThrow('ayrılmış')
    expect(() => parseSlides(s(brand, brand), file)).toThrow('slayt kimlikleri benzersiz olmalı ("brand" iki kez)')
    expect(() => parseSlides(s(brand, next, next), file)).toThrow('en fazla bir "next-competition"')
    expect(() => parseSlides(s({ discriminant: 'video' }), file)).toThrow('tür "video" tanınmıyor')
    expect(() => parseSlides({ slides: [] }, file)).toThrow('en az bir slayt')
    expect(() => parseSlides([brand], file)).toThrow('"slides" anahtarı')
  })
})

describe('localizeSlide / getSlides', () => {
  it('picks one language and keeps image, layout, focus and alt', () => {
    const [entry] = parseSlides(s(photo), file)
    expect(localizeSlide(entry, 'en')).toEqual({
      id: 'photo',
      type: 'static',
      title: 'Speedcubing Türkiye',
      lead: 'Lead.',
      actions: [{ label: 'Competitions', href: '/yarismalar', variant: 'solid' }],
      image: '/images/slides/podyum.jpg',
      layout: 'A',
      focus: 'top',
      alt: 'Podium',
    })
    expect(localizeSlide(parseSlides(s(brand), file)[0], 'tr')).toMatchObject({ title: 'Speedcubing Türkiye', lead: 'Açıklama.', layout: 'mark', image: undefined, alt: undefined })
    expect(localizeSlide({ type: 'next-competition' }, 'tr')).toEqual({ id: 'next-competition', type: 'next-competition' })
  })

  it('reads the repo file: the same ids and types in both languages', () => {
    const signature = (locale: 'tr' | 'en') => getSlides(locale).map((x) => `${x.id}:${x.type}`)
    expect(signature('tr')).toEqual(signature('en'))
    expect(signature('tr')).toContain('next-competition:next-competition')
  })
})
