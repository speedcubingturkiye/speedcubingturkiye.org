// lib/wca/markdown.ts: pure, no I/O
import type { Locale } from '@/i18n/routing'

/**
 * The WCA renders competition tabs with hard wraps: a single line break is a line break ("**Soru:** …" and "**Cevap:** …"
 * on consecutive lines). Plain Markdown joins such lines, so each one gets a hard break (two trailing spaces); blank
 * lines still separate paragraphs.
 */
export function hardWrap(markdown: string): string {
  return markdown.replace(/\r\n?/g, '\n').replace(/([^\n])\n(?=[^\n])/g, '$1  \n')
}

// A line that opens one language's part of a bilingual tab: "[TR]" / "[EN]", or a "# Türkçe:" / "## English" heading
const LANG_MARK = /^\s*(?:\[(TR|EN)\]|#{1,6}\s*(Türkçe|English):?)\s*$/i
// A thematic break ("----"), left between the parts
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

/**
 * The page language's part of a bilingual WCA tab. Türkiye organizers mark the parts with "[TR]" / "[EN]" lines or
 * "Türkçe" / "English" headings (139 of 143 recent tabs, Turkish first); the marks and the blank lines and rules at the
 * part edges are dropped, and text before the first mark is kept for both languages. A tab without both marks stays
 * whole. The name keeps its half of "Gruplar / Groups"; a name without exactly one slash stays whole.
 */
export function localizeTab(tab: { name: string; content: string }, locale: Locale): { name: string; content: string } {
  const halves = tab.name.split('/').map((s) => s.trim())
  const name = halves.length === 2 && halves[0] && halves[1] ? halves[locale === 'tr' ? 0 : 1] : tab.name.trim()
  const lines = tab.content.replace(/\r\n?/g, '\n').split('\n')
  const marks = lines.map((line) => {
    const m = LANG_MARK.exec(line)
    return m ? (/^(tr|türkçe)$/i.test(m[1] ?? m[2]) ? 'tr' : 'en') : null
  })
  if (!marks.includes('tr') || !marks.includes('en')) return { name, content: tab.content }
  const keep: string[] = []
  let part: Locale | null = null // null: before the first mark
  lines.forEach((line, i) => {
    if (marks[i]) part = marks[i]
    else if (part === null || part === locale) keep.push(line)
  })
  const edge = (line: string) => line.trim() === '' || RULE.test(line)
  while (keep.length && edge(keep[0])) keep.shift()
  while (keep.length && edge(keep[keep.length - 1])) keep.pop()
  return { name, content: keep.join('\n') }
}

/** An organizer-written URL that may become a link: http(s) or mailto only (no javascript:, data: or relative URLs). */
export function safeHref(url: unknown): string | null {
  const s = typeof url === 'string' ? url.trim() : ''
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : null
}

/** A Markdown link with a web URL: no brackets in the text, no spaces or parentheses in the URL. */
const LINK = /\[([^[\]]+)\]\((https?:\/\/[^\s()]+)\)/gi

/**
 * WCA venue fields are Markdown ("[Loba Coffee & Bakery](https://loba.com.tr)"): every `[text](http(s) URL)` becomes a
 * link part, everything else stays text, so a `javascript:` or relative URL and unbalanced brackets are shown as written.
 */
export function parseLinks(text: string): (string | { text: string; href: string })[] {
  const parts: (string | { text: string; href: string })[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ text: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
