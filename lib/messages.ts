// lib/messages.ts: messages/{tr,en}.json as an editor schema (spec §3.5) and the parity checks (spec §5.4). Pure: it
// runs in the panel's client bundle (keystatic.config.ts) and in the prebuild check. Keys are added or removed in code,
// never in the panel: the schema is generated from tr.json, so a key missing from a file fails the reader.
import { fields, type ComponentSchema } from '@keystatic/core'

export type MessageTree = { [key: string]: string | MessageTree }

export const PLACEHOLDER_NOTE = 'Süslü parantezli yer tutucuları ({date} gibi) silme ya da çevirme.'

/** Nested fields.object per namespace, fields.text per leaf; values over 80 characters get a multiline box. */
export function messagesSchema(tree: MessageTree, description?: string): Record<string, ComponentSchema> {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? fields.text({ label: key, description: PLACEHOLDER_NOTE, multiline: value.length > 80, validation: { isRequired: true } })
        : fields.object(messagesSchema(value), { label: key, description }),
    ]),
  )
}

/** { 'common.siteName': 'Speedcubing Türkiye', ... } */
export function flattenMessages(tree: MessageTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out[prefix + key] = value
    else Object.assign(out, flattenMessages(value, `${prefix}${key}.`))
  }
  return out
}

/** Sorted ICU argument names, each once (spec §5.4 compares sets): "{taken}/{limit}" → ['limit', 'taken']. */
export function placeholders(value: string): string[] {
  return [...new Set([...value.matchAll(/\{\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]))].sort()
}

function unbalanced(value: string): boolean {
  let depth = 0
  for (const ch of value) {
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth < 0) return true
  }
  return depth !== 0
}

/**
 * Turkish error lines, empty when fine: the same key tree in both files, the same placeholder names per key, balanced
 * braces in every value (intl-messageformat is not resolvable from the project under pnpm, so this is the parse check).
 */
export function checkMessages(tr: MessageTree, en: MessageTree): string[] {
  const a = flattenMessages(tr)
  const b = flattenMessages(en)
  const errors: string[] = []
  for (const key of Object.keys(a)) if (!(key in b)) errors.push(`messages/en.json: "${key}" anahtarı eksik`)
  for (const key of Object.keys(b)) if (!(key in a)) errors.push(`messages/tr.json: "${key}" anahtarı eksik`)
  for (const [file, flat] of [
    ['messages/tr.json', a],
    ['messages/en.json', b],
  ] as const) {
    for (const [key, value] of Object.entries(flat)) {
      if (unbalanced(value)) errors.push(`${file}: "${key}" değerinde süslü parantezler eşleşmiyor: ${JSON.stringify(value)}`)
    }
  }
  for (const key of Object.keys(a)) {
    if (!(key in b)) continue
    const pa = placeholders(a[key]).map((p) => `{${p}}`).join(' ')
    const pb = placeholders(b[key]).map((p) => `{${p}}`).join(' ')
    if (pa !== pb) errors.push(`messages/en.json: "${key}" yer tutucuları TR ile aynı değil (tr: ${pa}; en: ${pb})`)
  }
  return errors
}
