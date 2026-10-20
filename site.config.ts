// site.config.ts: code settings stay here; the team-editable settings live in content/site.json (spec §3.6), edited
// in the panel ("Site ayarları") and validated on import, so a bad value fails the build naming the file and field.
import raw from '@/content/site.json'
import { EMAIL_RE, isRecord, text, WCA_ID_RE } from '@/lib/content-rules'

export const CHANNEL_KEYS = ['instagram', 'discord', 'whatsapp', 'youtube', 'x', 'github', 'tiktok'] as const
export type ChannelKey = (typeof CHANNEL_KEYS)[number]

export type BoardMember = { name: string; role: { tr: string; en: string }; wcaId?: string }

export type SiteSettings = {
  /** empty string = channel hidden */
  channels: Record<ChannelKey, string>
  /** KVKK data controller; the name must be a real person before launch (docs/yayin-kontrol-listesi.md §10) */
  dataController: { name: string; email: string }
  /** Yönetim Kurulu (Tüzük Madde 6) */
  board: BoardMember[]
  /** Denetim Kurulu (Tüzük Madde 7) */
  auditBoard: BoardMember[]
  boardUpdatedAt: string
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
  const board = boardMembers(raw.board, 'board')
  const auditBoard = boardMembers(raw.auditBoard, 'auditBoard')
  const boardUpdatedAt = text(raw.boardUpdatedAt)
  if (!DATE.test(boardUpdatedAt)) fail(`boardUpdatedAt YYYY-AA-GG biçiminde olmalı ("${boardUpdatedAt}")`)
  return { channels, dataController, board, auditBoard, boardUpdatedAt }
}

/** One board list from the panel ({ name, roleTr, roleEn, wcaId }[]); errors name the list and the 1-based row. */
function boardMembers(list: unknown, key: string): BoardMember[] {
  return (Array.isArray(list) ? list : []).map((m, i) => {
    const at = `${key}[${i + 1}]`
    if (!isRecord(m) || !text(m.name)) fail(`${at} "name" boş olamaz`)
    if (!text(m.roleTr) || !text(m.roleEn)) fail(`${at} "roleTr" ve "roleEn" dolu olmalı`)
    const wcaId = text(m.wcaId)
    if (!WCA_ID_RE.test(wcaId)) fail(`${at} "wcaId" 2019TEME01 biçiminde olmalı ("${wcaId}")`)
    return { name: text(m.name), role: { tr: text(m.roleTr), en: text(m.roleEn) }, ...(wcaId ? { wcaId } : {}) }
  })
}

export const site = {
  name: 'Speedcubing Türkiye',
  url: 'https://speedcubingturkiye.org',
  contactEmail: process.env.CONTACT_EMAIL ?? 'info@speedcubingturkiye.org',
  /** Safety reports from the contact form; only the Güvenlik Sorumlusu and the deputy read it (Güvenlik politikası 3).
   *  `||`, not `??`: an empty SAFEGUARDING_EMAIL= in .env.local means the default too. */
  safeguardingEmail: process.env.SAFEGUARDING_EMAIL || 'guvenlik@speedcubingturkiye.org',
  /** The news and announcement mailings' sender */
  mailFrom: process.env.MAIL_FROM ?? 'news@speedcubingturkiye.org',
  /** Every other mail's sender: confirmations and the contact form's notices, replies going to Reply-To. The SES key may
   *  send as these two addresses only (IAM, docs/yayin-kontrol-listesi.md §2). */
  noReplyFrom: 'noreply@speedcubingturkiye.org',
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
