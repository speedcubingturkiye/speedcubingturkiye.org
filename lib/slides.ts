// lib/slides.ts: home carousel content (spec §3.2): one bilingual file, content/home/slides.json, in the shape the
// panel writes ({ slides: [{ discriminant, value }] }). Validated when this module loads, so a bad slide fails
// `next build` (the home page is prerendered) and scripts/check-content.ts (prebuild) with a Turkish message naming
// the slide. The field rules come from lib/content-rules.ts, as the panel's schema (keystatic.config.ts) does; the
// cross-field rules (photo required unless "mark", unique ids, one next-competition slide) live only here.
import type { Locale } from '@/i18n/routing'
import raw from '@/content/home/slides.json'
import {
  ACTIONS_MAX,
  FOCUSES,
  HREF_RE,
  isRecord,
  LABEL_MAX,
  LAYOUTS,
  LEAD_MAX,
  SLIDE_IMAGE_PREFIX,
  SLUG_RE,
  text,
  TITLE_MAX,
  type Focus,
  type Layout,
} from '@/lib/content-rules'

export const SLIDES_FILE = 'content/home/slides.json'

export type SlideAction = { label: string; href: string; variant: 'solid' | 'outline' }
export type StaticSlide = {
  id: string
  type: 'static'
  title: string
  lead: string
  actions: SlideAction[]
  /** /images/slides/<file>; required unless layout is "mark" */
  image?: string
  layout: Layout
  /** object-position of the photo */
  focus: Focus
  /** photo description for screen readers; absent = decorative (alt="") */
  alt?: string
}
export type NextCompetitionSlide = { id: 'next-competition'; type: 'next-competition' }
export type Slide = StaticSlide | NextCompetitionSlide

/** One slide as stored in the file, both languages. */
export type StaticEntry = {
  type: 'static'
  id: string
  titleTr: string
  titleEn: string
  leadTr: string
  leadEn: string
  actions: { labelTr: string; labelEn: string; href: string; variant: 'solid' | 'outline' }[]
  image?: string
  layout: Layout
  focus: Focus
  altTr?: string
  altEn?: string
}
export type SlideEntry = StaticEntry | { type: 'next-competition' }

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)

function fail(file: string, index: number, message: string): never {
  throw new Error(`${file}: slayt ${index + 1}: ${message}`)
}

function required(v: unknown, max: number, name: string, file: string, index: number): string {
  const s = text(v)
  if (!s) fail(file, index, `"${name}" boş olamaz`)
  if (s.length > max) fail(file, index, `"${name}" ${max} karakteri aşıyor (${s.length})`)
  return s
}

function parseAction(v: unknown, file: string, index: number): StaticEntry['actions'][number] {
  if (!isRecord(v)) fail(file, index, 'düğme alanları eksik')
  const href = text(v.href)
  // Site paths get their locale prefix from the Link that renders them; https:// links open in a new tab (HeroCarousel).
  if (!HREF_RE.test(href)) fail(file, index, `düğme adresi "/" ile başlamalı ya da "https://" ile tam adres olmalı ("${href}")`)
  if (v.variant !== 'solid' && v.variant !== 'outline') fail(file, index, 'düğme görünümü "solid" ya da "outline" olmalı')
  return {
    labelTr: required(v.labelTr, LABEL_MAX, 'labelTr', file, index),
    labelEn: required(v.labelEn, LABEL_MAX, 'labelEn', file, index),
    href,
    variant: v.variant,
  }
}

function parseStatic(v: unknown, file: string, index: number): StaticEntry {
  if (!isRecord(v)) fail(file, index, 'slayt alanları eksik')
  const id = text(v.id)
  if (!SLUG_RE.test(id)) fail(file, index, `"id" boş olamaz ve yalnız küçük harf, rakam ve tire içerebilir ("${id}")`)
  if (id === 'next-competition') fail(file, index, '"next-competition" kimliği sıradaki yarışma slaytına ayrılmış')
  if (!Array.isArray(v.actions) || v.actions.length === 0) fail(file, index, 'en az bir düğme gerekli')
  if (v.actions.length > ACTIONS_MAX) fail(file, index, `en fazla ${ACTIONS_MAX} düğme olabilir`)
  const layout = v.layout === undefined ? 'mark' : v.layout
  if (!oneOf(LAYOUTS, layout)) fail(file, index, `yerleşim ${JSON.stringify(layout)} tanınmıyor (${LAYOUTS.join(', ')})`)
  const focus = v.focus === undefined ? 'center' : v.focus
  if (!oneOf(FOCUSES, focus)) fail(file, index, `odak ${JSON.stringify(focus)} tanınmıyor (${FOCUSES.join(', ')})`)
  const image = text(v.image)
  if (image && !image.startsWith(SLIDE_IMAGE_PREFIX)) fail(file, index, `fotoğraf yolu "${SLIDE_IMAGE_PREFIX}" ile başlamalı ("${image}")`)
  if (!image && layout !== 'mark') fail(file, index, `fotoğraf seçilmeden "${layout}" yerleşimi kullanıyor`)
  const altTr = text(v.altTr)
  const altEn = text(v.altEn)
  return {
    type: 'static',
    id,
    titleTr: required(v.titleTr, TITLE_MAX, 'titleTr', file, index),
    titleEn: required(v.titleEn, TITLE_MAX, 'titleEn', file, index),
    leadTr: required(v.leadTr, LEAD_MAX, 'leadTr', file, index),
    leadEn: required(v.leadEn, LEAD_MAX, 'leadEn', file, index),
    actions: v.actions.map((a) => parseAction(a, file, index)),
    ...(image ? { image } : {}),
    layout,
    focus,
    ...(altTr ? { altTr } : {}),
    ...(altEn ? { altEn } : {}),
  }
}

/** Type guard and validator for slides.json. Throws with the file and slide number on the first problem. */
export function parseSlides(raw: unknown, file = SLIDES_FILE): SlideEntry[] {
  const list = isRecord(raw) ? raw.slides : undefined
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${file}: "slides" anahtarı altında en az bir slayt içeren bir liste bekleniyor`)
  }
  const entries = list.map((item, i): SlideEntry => {
    if (!isRecord(item)) fail(file, i, 'slayt bir nesne olmalı')
    if (item.discriminant === 'next-competition') return { type: 'next-competition' }
    if (item.discriminant !== 'static') fail(file, i, `tür ${JSON.stringify(item.discriminant)} tanınmıyor ("static" ya da "next-competition" bekleniyor)`)
    return parseStatic(item.value, file, i)
  })
  const ids = entries.flatMap((e) => (e.type === 'static' ? [e.id] : []))
  const dup = ids.find((id, i) => ids.indexOf(id) !== i)
  if (dup) throw new Error(`${file}: slayt kimlikleri benzersiz olmalı ("${dup}" iki kez)`)
  if (entries.filter((e) => e.type === 'next-competition').length > 1) throw new Error(`${file}: en fazla bir "next-competition" slaytı olabilir`)
  return entries
}

export function localizeSlide(entry: SlideEntry, locale: Locale): Slide {
  if (entry.type === 'next-competition') return { id: 'next-competition', type: 'next-competition' }
  const t = (tr: string, en: string) => (locale === 'tr' ? tr : en)
  return {
    id: entry.id,
    type: 'static',
    title: t(entry.titleTr, entry.titleEn),
    lead: t(entry.leadTr, entry.leadEn),
    actions: entry.actions.map((a) => ({ label: t(a.labelTr, a.labelEn), href: a.href, variant: a.variant })),
    image: entry.image,
    layout: entry.layout,
    focus: entry.focus,
    alt: locale === 'tr' ? entry.altTr : entry.altEn,
  }
}

const ENTRIES = parseSlides(raw)

export function getSlides(locale: Locale): Slide[] {
  return ENTRIES.map((e) => localizeSlide(e, locale))
}
