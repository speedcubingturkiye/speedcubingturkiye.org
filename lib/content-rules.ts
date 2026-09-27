// lib/content-rules.ts: the content rules the panel (keystatic.config.ts) and the build (lib/slides.ts, lib/gallery.ts,
// site.config.ts, lib/news.ts) both enforce, defined once so the two sides cannot drift. Pure, with no content imports:
// the panel's client bundle loads it, while importing a parser instead (lib/slides.ts reads slides.json on import) would
// lock the panel out in dev as soon as that file held a slide the parser rejects.

/** A plain JSON object. */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
/** A trimmed string; '' for anything else. */
export const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** News slugs (the folder name, trSlug's output), slide ids and anchor ids. The reader also refuses "." and "..". */
export const SLUG_RE = /^[a-z0-9-]+$/
/** Slide buttons: a site path ("/" first; the Link adds the locale) or a full https:// address. */
export const HREF_RE = /^(\/\S*|https:\/\/\S+)$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** A WCA person id such as 2019TEME01; '' passes too, the field is optional. */
export const WCA_ID_RE = /^(\d{4}[A-Z]{4}\d{2})?$/

/** Slide limits (spec §3.2): title, lead and button label in characters; buttons per slide (at least one). */
export const TITLE_MAX = 40
export const LEAD_MAX = 160
export const LABEL_MAX = 40
export const ACTIONS_MAX = 2

/** Where the panel's uploads are served from (public/ + prefix). */
export const SLIDE_IMAGE_PREFIX = '/images/slides/'
export const GALLERY_PREFIX = '/galeri/'
export const DOCS_PREFIX = '/docs/'

/** Slide photo layouts (spec §3.3) with their panel labels; "mark" is the default. */
export const LAYOUT_OPTIONS = [
  { label: 'Logo (fotoğrafsız, bugünkü yerleşim)', value: 'mark' },
  { label: 'A: fotoğraf sağda, keskin kenar', value: 'A' },
  { label: 'D: fotoğraf sağda, 45° sivri köşe', value: 'D' },
  { label: 'E: fotoğraf sağda, kırmızı-siyah ton', value: 'E' },
  { label: 'G: tonlu fotoğraf tüm bantta, logo sağda', value: 'G' },
  { label: 'J: fotoğraf üstte, kırmızı şerit altta', value: 'J' },
] as const
/** The slide photo's object-position; "center" is the default. */
export const FOCUS_OPTIONS = [
  { label: 'Orta', value: 'center' },
  { label: 'Üst', value: 'top' },
  { label: 'Alt', value: 'bottom' },
  { label: 'Sol', value: 'left' },
  { label: 'Sağ', value: 'right' },
] as const
export type Layout = (typeof LAYOUT_OPTIONS)[number]['value']
export type Focus = (typeof FOCUS_OPTIONS)[number]['value']
export const LAYOUTS = LAYOUT_OPTIONS.map((o) => o.value)
export const FOCUSES = FOCUS_OPTIONS.map((o) => o.value)

/** News categories (spec §3.1) with their panel labels. */
export const NEWS_CATEGORIES = [
  { label: 'Yarışma', value: 'yarisma' },
  { label: 'Topluluk', value: 'topluluk' },
  { label: 'Rekor', value: 'rekor' },
  { label: 'İlan', value: 'ilan' },
] as const
