// lib/content-check.ts: pure helpers for scripts/check-content.ts (spec §5). Turkish messages naming file and field.

/** The MDX components the site renders (components/mdx-components.tsx) and the panel knows (keystatic.config.ts). */
export const MDX_COMPONENTS = ['Details', 'Callout', 'DataController', 'MdxLink', 'Anchor', 'Lang'] as const

/** The singletons that are data files, by key, with the file the gate names in its messages; the rest are the pages. */
export const DATA_SINGLETONS: Record<string, string> = {
  slides: 'content/home/slides.json',
  messagesTr: 'messages/tr.json',
  messagesEn: 'messages/en.json',
  site: 'content/site.json',
  gallery: 'content/gallery.json',
}

/**
 * Lines the panel could not open. Every unescaped `<` that is not followed by a space must open or close one of the
 * site's components: raw HTML (<h2 id>, <div lang>, <span>) compiles on the site but the editor refuses it ("Missing
 * component definition"), and `<2026` or `<=` stops both. An unescaped `{` starts an MDX expression for both. The
 * escapes the editor itself writes for a typed character (`\<`, `\{`) are fine. Fenced code and inline code (`<b>`,
 * `{x}`) are skipped: both keep their text literal. `<https://…>` is not: MDX has no autolinks, so the panel's parser
 * and the site's compile both read it as a tag with a bad name.
 */
export function mdxBodyErrors(body: string, file: string, allowed: readonly string[] = MDX_COMPONENTS): string[] {
  const errors: string[] = []
  let fenced = false
  body.split('\n').forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) {
      fenced = !fenced
      return
    }
    if (fenced) return
    const at = `${file}:${i + 1}`
    // An inline code span runs from a backtick run to the next run of the same length (``a ` b``); \` opens none.
    const line = raw.replace(/(?<!\\)(`+).*?\1/g, '')
    for (const m of line.matchAll(/(?:^|[^\\])<(?![ \t])\/?([A-Za-z][\w-]*)?/g)) {
      const tag = m[1] ?? ''
      if (!allowed.includes(tag)) {
        errors.push(`${at}: "<${tag}" panelin açamayacağı ham HTML ya da tanımsız bileşen; yalnız ${allowed.join(', ')} kullanılabilir (metinde "<" için \\< yaz)`)
      }
    }
    if (/(?:^|[^\\])\{/.test(line)) errors.push(`${at}: "{" panelin açamayacağı MDX ifadesi; metinde süslü parantez için \\{ yaz`)
  })
  return errors
}

/** Spec §3.8: a referenced photo over this size fails the build (documents are only checked for existence). */
export const MAX_ASSET_BYTES = 5 * 1024 * 1024

/** Turkish line for one referenced public/ file; size null = missing. */
export function assetError(ref: string, publicPath: string, size: number | null): string | null {
  if (size === null) return `${ref}: dosya yok: public${publicPath}`
  if (size > MAX_ASSET_BYTES) return `${ref}: public${publicPath} ${(size / 1024 / 1024).toFixed(1)} MB; sınır 5 MB, görseli küçült`
  return null
}

/** Local image paths in an MDX body: ![alt](/images/news/x.jpg) */
export function bodyImagePaths(body: string): string[] {
  return [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]).filter((p) => p.startsWith('/'))
}

/**
 * Keystatic's reader error ("Invalid data for ...:\n<field>: <message>", field labels are ours and Turkish, the rest
 * is Keystatic's English) as one line per field, prefixed with the file.
 */
export function readerErrorTr(e: unknown, file: string): string {
  const message = e instanceof Error ? e.message : String(e)
  const [first, ...rest] = message.split('\n')
  const fields = rest.map((l) => l.replace(/^:\s*/, 'kök: ')).filter(Boolean)
  if (fields.length === 0) return `${file}: panel şemasına uymuyor: ${first}`
  return `${file}: panel şemasına uymuyor:\n${fields.map((l) => `    ${l}`).join('\n')}`
}
