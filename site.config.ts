// site.config.ts: code settings stay here; the team-editable settings live in content/site.json (spec §3.6), edited
// in the panel ("Site ayarları") and validated on import, so a bad value fails the build naming the file and field.
import raw from '@/content/site.json'
import { DOCS_PREFIX, EMAIL_RE, isRecord, text, WCA_ID_RE } from '@/lib/content-rules'

export const CHANNEL_KEYS = ['instagram', 'discord', 'whatsapp', 'youtube', 'x', 'github', 'tiktok'] as const
export type ChannelKey = (typeof CHANNEL_KEYS)[number]

export type SiteSettings = {
  /** empty string = channel hidden */
  channels: Record<ChannelKey, string>
  /** KVKK data controller; the name must be a real person before launch (docs/yayin-kontrol-listesi.md §10) */
  dataController: { name: string; email: string }
  board: { name: string; role: { tr: string; en: string }; wcaId?: string }[]
  boardUpdatedAt: string
  documents: { title: { tr: string; en: string }; date: string; file: string }[]
}

const FILE = 'content/site.json'
const DATE = /^\d{4}-\d{2}-\d{2}$/
// A function declaration, not an arrow const: TypeScript only narrows after calls to declared `never` functions
// (with `const fail = (): never => ...`, `raw` stays `unknown` below and typecheck fails).
function fail(message: string): never {
  throw new Error(`${FILE}: ${message}`)
}

export function parseSiteSettings(raw: unknown): SiteSettings {
  if (!isRecord(raw)) fail('bir JSON nesnesi bekleniyor')
  const ch = isRecord(raw.channels) ? raw.channels : {}
  const channels = Object.fromEntries(
    CHANNEL_KEYS.map((key) => {
      const url = text(ch[key])
      if (url && !url.startsWith('https://')) fail(`channels.${key} "https://" ile başlamalı ("${url}")`)
      return [key, url]
    }),
  ) as Record<ChannelKey, string>
  const dc = isRecord(raw.dataController) ? raw.dataController : {}
  const dataController = { name: text(dc.name), email: text(dc.email) }
  if (!dataController.name) fail('dataController.name boş olamaz')
  if (!EMAIL_RE.test(dataController.email)) fail(`dataController.email geçerli bir e-posta olmalı ("${dataController.email}")`)
  const board = (Array.isArray(raw.board) ? raw.board : []).map((m, i) => {
    const at = `board[${i + 1}]`
    if (!isRecord(m) || !text(m.name)) fail(`${at} "name" boş olamaz`)
    if (!text(m.roleTr) || !text(m.roleEn)) fail(`${at} "roleTr" ve "roleEn" dolu olmalı`)
    const wcaId = text(m.wcaId)
    if (!WCA_ID_RE.test(wcaId)) fail(`${at} "wcaId" 2019TEME01 biçiminde olmalı ("${wcaId}")`)
    return { name: text(m.name), role: { tr: text(m.roleTr), en: text(m.roleEn) }, ...(wcaId ? { wcaId } : {}) }
  })
  const boardUpdatedAt = text(raw.boardUpdatedAt)
  if (!DATE.test(boardUpdatedAt)) fail(`boardUpdatedAt YYYY-AA-GG biçiminde olmalı ("${boardUpdatedAt}")`)
  const documents = (Array.isArray(raw.documents) ? raw.documents : []).map((d, i) => {
    const at = `documents[${i + 1}]`
    if (!isRecord(d) || !text(d.titleTr) || !text(d.titleEn)) fail(`${at} "titleTr" ve "titleEn" dolu olmalı`)
    if (!DATE.test(text(d.date))) fail(`${at} "date" YYYY-AA-GG biçiminde olmalı ("${text(d.date)}")`)
    if (!text(d.file).startsWith(DOCS_PREFIX)) fail(`${at} "file" "${DOCS_PREFIX}" ile başlamalı ("${text(d.file)}")`)
    return { title: { tr: text(d.titleTr), en: text(d.titleEn) }, date: text(d.date), file: text(d.file) }
  })
  return { channels, dataController, board, boardUpdatedAt, documents }
}

export const site = {
  name: 'Speedcubing Türkiye',
  url: 'https://speedcubingturkiye.org',
  contactEmail: process.env.CONTACT_EMAIL ?? 'info@speedcubingturkiye.org',
  mailFrom: process.env.MAIL_FROM ?? 'news@speedcubingturkiye.org',
  ...parseSiteSettings(raw),
}

/** Display names for `site.channels` keys; one definition for Footer, the homepage CTA and the panel. */
export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  instagram: 'Instagram',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  x: 'X (Twitter)',
  github: 'GitHub',
  tiktok: 'TikTok',
}

/** Non-empty `site.channels` entries, in declaration order, paired with their label. */
export function activeChannels(): [ChannelKey, string][] {
  return CHANNEL_KEYS.filter((key) => site.channels[key] !== '').map((key) => [key, CHANNEL_LABELS[key]])
}
