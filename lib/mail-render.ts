// lib/mail-render.ts: the site's mails as HTML + plain text (spec §7). A news body (MDX) is parsed to mdast and
// rendered by hand into inline-styled HTML that mail clients keep; nothing is loaded from another host. Pure: the cron,
// the newsletter route, the preview and the tests all get the same mail.
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import type { Nodes, Root, Table } from 'mdast'
import type { Locale } from '@/i18n/routing'
import { escapeHtml } from '@/lib/escape-html'
import { site } from '@/site.config'
import trMessages from '@/messages/tr.json'
import enMessages from '@/messages/en.json'

export type RenderedMail = { subject: string; html: string; text: string }
export type NewsMail = { locale: Locale; title: string; description: string; source: string; readMoreUrl: string; unsubscribeUrl: string }

// MDX JSX nodes (remark-mdx); typed here instead of pulling in mdast-util-mdx-jsx's type augmentation.
type Jsx = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name: string | null
  attributes: { type: string; name?: string; value?: unknown }[]
  children: Node[]
}
type Node = Nodes | Jsx
type Ctx = { locale: Locale }

const INK = '#1a1a1a'
const INK2 = '#555555'
const LINE = '#e2e2e0'
const PANEL = '#f4f4f2'
const RED = '#c4000f'
const BRAND = '#e30a17'
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
// The wordmark with a white outline: it stays readable when a mail app darkens the page (apps never recolour images).
// 600 px wide, shown at 300 px; served from our own host like every image in a mail.
const LOGO = `${site.url}/brand/logo-mail.png`

const T = {
  tr: {
    readMore: 'Sitede oku',
    newsFooter: 'Bu maili Speedcubing Türkiye bültenine abone olduğun için aldın.',
    unsubscribe: 'Abonelikten çık',
    confirmSubject: 'Bülten aboneliğini onayla',
    confirmLead: 'Speedcubing Türkiye bültenine kaydolmak için aşağıdaki düğmeye tıkla. Formda verdiğin onay:',
    confirmButton: 'Aboneliğimi onayla',
    confirmIgnore: 'Bu isteği sen yapmadıysan bu maili yok sayabilirsin; 7 gün içinde onaylanmayan adresler silinir.',
    confirmFooter: "Bu maili speedcubingturkiye.org'daki bülten formu doldurulduğu için aldın.",
  },
  en: {
    readMore: 'Read on our site',
    newsFooter: 'You received this email because you subscribed to the Speedcubing Türkiye newsletter.',
    unsubscribe: 'Unsubscribe',
    confirmSubject: 'Confirm your newsletter subscription',
    confirmLead: 'To subscribe to the Speedcubing Türkiye newsletter, click the button below. The consent you gave on the form:',
    confirmButton: 'Confirm my subscription',
    confirmIgnore: 'If you did not ask for this, ignore this email; addresses not confirmed within 7 days are deleted.',
    confirmFooter: 'You received this email because the newsletter form on speedcubingturkiye.org was filled in.',
  },
} as const

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)

const kids = (n: Node): Node[] => ('children' in n ? (n.children as Node[]) : [])
const attr = (n: Jsx, name: string): string => {
  const a = n.attributes.find((x) => x.type === 'mdxJsxAttribute' && x.name === name)
  return typeof a?.value === 'string' ? a.value : ''
}
const jsxLocale = (n: Jsx, fallback: Locale): Locale => (attr(n, 'locale') === 'en' ? 'en' : attr(n, 'locale') === 'tr' ? 'tr' : fallback)

/** Site-relative addresses become absolute; pages get the language prefix, files under public/ do not. A protocol-relative
 *  address (//host/path) names another host, not a page here: it stays as it is, so image() and safe() refuse it. */
export function absoluteUrl(url: string, locale: Locale): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url
  const file = /^\/(images|docs|galeri|brand)\//.test(url) || /\.[a-z0-9]+$/i.test(url.split(/[?#]/)[0])
  if (file) return `${site.url}${url}`
  return `${site.url}${locale === 'en' ? '/en' : ''}${url === '/' ? '' : url}`
}

const safe = (href: string) => /^(https?:|mailto:)/i.test(href)

function link(url: string, body: string, locale: Locale): string {
  const href = absoluteUrl(url, locale)
  return safe(href) ? `<a href="${escapeHtml(href)}" style="color:${RED};text-decoration:underline">${body}</a>` : body
}

function image(url: string, alt: string, locale: Locale): string {
  const src = absoluteUrl(url, locale)
  // Only the site's own files: a mail never loads anything from another host (KVKK, spec §7)
  if (!src.startsWith(`${site.url}/`)) return ''
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display:block;max-width:100%;height:auto;margin:0 0 16px">`
}

function dataController(n: Jsx, html: boolean): string {
  const { name, email } = site.dataController
  const field = attr(n, 'field')
  if (!html) return field === 'name' ? name : field === 'email' ? email : `${name} · ${email}`
  const mail = `<a href="mailto:${escapeHtml(email)}" style="color:${RED}">${escapeHtml(email)}</a>`
  return field === 'name' ? `<strong>${escapeHtml(name)}</strong>` : field === 'email' ? mail : `<strong>${escapeHtml(name)}</strong> · ${mail}`
}

// ---- HTML ----

function inline(nodes: readonly Node[], ctx: Ctx): string {
  return nodes.map((n) => inlineNode(n, ctx)).join('')
}

function inlineNode(n: Node, ctx: Ctx): string {
  switch (n.type) {
    case 'text':
      return escapeHtml(n.value)
    case 'strong':
      return `<strong>${inline(n.children, ctx)}</strong>`
    case 'emphasis':
      return `<em>${inline(n.children, ctx)}</em>`
    case 'delete':
      return `<s>${inline(n.children, ctx)}</s>`
    case 'inlineCode':
      return `<code style="font-family:monospace;background:${PANEL};padding:0 3px">${escapeHtml(n.value)}</code>`
    case 'break':
      return '<br>'
    case 'link':
      return link(n.url, inline(n.children, ctx), ctx.locale)
    case 'image':
      return image(n.url, n.alt ?? '', ctx.locale)
    case 'mdxJsxTextElement':
    case 'mdxJsxFlowElement':
      return jsx(n, ctx)
    case 'html':
      return '' // raw HTML never reaches a mail (the prebuild gate forbids it anyway)
    default:
      return inline(kids(n), ctx)
  }
}

function jsx(n: Jsx, ctx: Ctx): string {
  switch (n.name) {
    case 'Callout': {
      const title = attr(n, 'title')
      const head = title ? `<p style="margin:0 0 8px;font-weight:bold">${escapeHtml(title)}</p>` : ''
      return `<div style="border:1px solid ${LINE};background:${PANEL};padding:12px 16px;margin:0 0 16px">${head}${blocks(n.children, ctx)}</div>`
    }
    case 'Details':
      return `<div style="margin:0 0 16px"><p style="margin:0 0 8px;font-weight:bold">${escapeHtml(attr(n, 'summary'))}</p>${blocks(n.children, ctx)}</div>`
    case 'DataController':
      return dataController(n, true)
    case 'MdxLink':
      return link(attr(n, 'href'), inline(n.children, ctx), jsxLocale(n, ctx.locale))
    case 'Lang':
      return n.type === 'mdxJsxFlowElement' ? blocks(n.children, ctx) : inline(n.children, ctx)
    case 'Anchor':
      return ''
    default:
      console.warn('mail-render: dropped component', n.name)
      return ''
  }
}

function blocks(nodes: readonly Node[], ctx: Ctx): string {
  return nodes.map((n) => block(n, ctx)).join('')
}

function block(n: Node, ctx: Ctx): string {
  switch (n.type) {
    case 'paragraph':
      return `<p style="margin:0 0 16px">${inline(n.children, ctx)}</p>`
    case 'heading': {
      const tag = n.depth <= 2 ? 'h2' : 'h3'
      const size = tag === 'h2' ? 20 : 17
      return `<${tag} style="margin:24px 0 8px;font-size:${size}px;line-height:1.3">${inline(n.children, ctx)}</${tag}>`
    }
    case 'list': {
      const tag = n.ordered ? 'ol' : 'ul'
      const start = n.ordered && n.start && n.start !== 1 ? ` start="${n.start}"` : ''
      const items = n.children.map((li) => `<li style="margin:0 0 4px">${listItem(li.children, ctx)}</li>`).join('')
      return `<${tag}${start} style="margin:0 0 16px;padding-left:24px">${items}</${tag}>`
    }
    case 'blockquote':
      return `<blockquote style="margin:0 0 16px;padding-left:12px;border-left:3px solid ${LINE};color:${INK2}">${blocks(n.children, ctx)}</blockquote>`
    case 'thematicBreak':
      return `<hr style="border:0;border-top:1px solid ${LINE};margin:24px 0">`
    case 'code':
      return `<pre style="margin:0 0 16px;padding:12px;background:${PANEL};white-space:pre-wrap;font-family:monospace">${escapeHtml(n.value)}</pre>`
    case 'table':
      return table(n, ctx)
    default:
      return inlineNode(n, ctx)
  }
}

/** A list item's paragraphs without their bottom margin, so a tight list stays tight. */
function listItem(children: readonly Node[], ctx: Ctx): string {
  return children.map((c) => (c.type === 'paragraph' ? inline(c.children, ctx) : block(c, ctx))).join('<br>')
}

function table(n: Table, ctx: Ctx): string {
  const rows = n.children
    .map((row, i) => {
      const tag = i === 0 ? 'th' : 'td'
      const cells = row.children.map((cell) => `<${tag} style="border:1px solid ${LINE};padding:4px 8px;text-align:left">${inline(cell.children, ctx)}</${tag}>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  return `<table style="border-collapse:collapse;margin:0 0 16px">${rows}</table>`
}

// ---- Plain text ----

function plainInline(nodes: readonly Node[], ctx: Ctx): string {
  return nodes.map((n) => plainInlineNode(n, ctx)).join('')
}

function plainInlineNode(n: Node, ctx: Ctx): string {
  switch (n.type) {
    case 'text':
    case 'inlineCode':
      return n.value
    case 'break':
      return '\n'
    case 'image':
    case 'html':
      return ''
    case 'link': {
      const label = plainInline(n.children, ctx)
      const url = absoluteUrl(n.url, ctx.locale)
      if (!safe(url)) return label
      return label === url ? url : `${label} (${url})`
    }
    case 'mdxJsxTextElement':
    case 'mdxJsxFlowElement':
      return plainJsx(n, ctx)
    default:
      return plainInline(kids(n), ctx)
  }
}

function plainJsx(n: Jsx, ctx: Ctx): string {
  switch (n.name) {
    case 'DataController':
      return dataController(n, false)
    case 'MdxLink': {
      const url = absoluteUrl(attr(n, 'href'), jsxLocale(n, ctx.locale))
      return safe(url) ? `${plainInline(n.children, ctx)} (${url})` : plainInline(n.children, ctx)
    }
    case 'Callout':
      return [attr(n, 'title'), plainBlocks(n.children, ctx)].filter(Boolean).join('\n\n')
    case 'Details':
      return [attr(n, 'summary'), plainBlocks(n.children, ctx)].filter(Boolean).join('\n\n')
    case 'Lang':
      return n.type === 'mdxJsxFlowElement' ? plainBlocks(n.children, ctx) : plainInline(n.children, ctx)
    default:
      return ''
  }
}

function plainBlocks(nodes: readonly Node[], ctx: Ctx): string {
  return nodes
    .map((n) => plainBlock(n, ctx))
    .filter(Boolean)
    .join('\n\n')
}

function plainBlock(n: Node, ctx: Ctx): string {
  switch (n.type) {
    case 'paragraph':
    case 'heading':
      return plainInline(n.children, ctx)
    case 'list':
      // Every continuation line of an item (a second paragraph, each child of a nested list) sits under the marker.
      return n.children
        .map((li, i) => `${n.ordered ? `${(n.start ?? 1) + i}.` : '-'} ${plainBlocks(li.children, ctx).replace(/\n\n/g, '\n').replace(/\n/g, '\n  ')}`)
        .join('\n')
    case 'blockquote':
      return plainBlocks(n.children, ctx)
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'thematicBreak':
      return '---'
    case 'code':
      return n.value
    case 'table':
      return n.children.map((row) => row.children.map((c) => plainInline(c.children, ctx)).join(' | ')).join('\n')
    default:
      return plainInlineNode(n, ctx)
  }
}

// ---- Frame ----

function frame(locale: Locale, content: string, footer: string): string {
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;${FONT};font-size:16px;line-height:1.6;color:${INK}">
<p style="margin:0 0 24px"><img src="${LOGO}" width="300" height="36" alt="${escapeHtml(site.name)}" style="display:block;border:0;width:300px;height:auto"></p>
${content}
<hr style="border:0;border-top:1px solid ${LINE};margin:32px 0 16px">
<p style="margin:0;font-size:13px;color:${INK2}">${footer} · <a href="${site.url}" style="color:${INK2}">${site.url.replace('https://', '')}</a></p>
</div>
</body></html>`
}

/** A news entry (or an announcement) as a mail in one language (spec §7). */
export function renderNewsMail(m: NewsMail): RenderedMail {
  const ctx: Ctx = { locale: m.locale }
  const tree = processor.parse(m.source) as Root
  const s = T[m.locale]
  const content = [
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25">${escapeHtml(m.title)}</h1>`,
    `<p style="margin:0 0 24px;color:${INK2};font-size:17px">${escapeHtml(m.description)}</p>`,
    blocks(tree.children, ctx),
    `<p style="margin:24px 0 0"><a href="${escapeHtml(m.readMoreUrl)}" style="color:${RED};font-weight:bold">${s.readMore}</a></p>`,
  ].join('\n')
  const footer = `${s.newsFooter} <a href="${escapeHtml(m.unsubscribeUrl)}" style="color:${INK2}">${s.unsubscribe}</a>`
  const text = [m.title, m.description, plainBlocks(tree.children, ctx), `${s.readMore}: ${m.readMoreUrl}`, '--', `${s.newsFooter}\n${s.unsubscribe}: ${m.unsubscribeUrl}`].join('\n\n')
  return { subject: m.title, html: frame(m.locale, content, footer), text }
}

/** The double opt-in mail (spec §7): the form's consent text word for word, and the confirm button. */
export function renderConfirmMail({ locale, confirmUrl }: { locale: Locale; confirmUrl: string }): RenderedMail {
  const s = T[locale]
  const consent = (locale === 'tr' ? trMessages : enMessages).forms.newsletterConsent
  const content = [
    `<p style="margin:0 0 16px">${s.confirmLead}</p>`,
    `<blockquote style="margin:0 0 24px;padding-left:12px;border-left:3px solid ${LINE};color:${INK2}">${escapeHtml(consent)}</blockquote>`,
    `<p style="margin:0 0 24px"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:${BRAND};color:#ffffff;font-weight:bold;padding:12px 20px;text-decoration:none">${s.confirmButton}</a></p>`,
    `<p style="margin:0;font-size:14px;color:${INK2}">${s.confirmIgnore}</p>`,
  ].join('\n')
  const text = [s.confirmLead, consent, `${s.confirmButton}: ${confirmUrl}`, s.confirmIgnore, '--', s.confirmFooter].join('\n\n')
  return { subject: s.confirmSubject, html: frame(locale, content, s.confirmFooter), text }
}

/** RFC 8058 one-click unsubscribe, on every mailing (not on the confirmation mail). */
export function unsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}
