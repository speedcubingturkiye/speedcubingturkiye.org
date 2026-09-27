// scripts/check-content.ts: the prebuild gate (spec §5). Any error stops the build, so the live site keeps its last
// good deploy and Vercel mails the failure. Every message is Turkish and names the file and, where there is one, the
// field. The schemas in keystatic.config.ts are the single source: the panel enforces them field by field while
// editing, the Keystatic reader re-checks every file here.
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { PAGES, pageKey } from '@/keystatic.config'
import { assetError, bodyImagePaths, DATA_SINGLETONS, mdxBodyErrors, readerErrorTr } from '@/lib/content-check'
import { listGalleryImages } from '@/lib/gallery' // validates content/gallery.json on import (Turkish message)
import { checkMessages } from '@/lib/messages'
import { reader, singletons } from '@/lib/news'
import { getSlides } from '@/lib/slides' // validates content/home/slides.json on import (Turkish message)
import { site } from '@/site.config' // validates content/site.json on import (Turkish message)
import trMessages from '@/messages/tr.json'
import enMessages from '@/messages/en.json'

const ROOT = process.cwd()
const errors: string[] = []

/** Every public/ file the content refers to must exist; photos also stay under 5 MB (spec §3.8, §5.5, §5.6). */
function checkAsset(ref: string, publicPath: string, photo = true) {
  const file = path.join(ROOT, 'public', publicPath)
  const e = assetError(ref, publicPath, existsSync(file) ? (photo ? statSync(file).size : 0) : null)
  if (e) errors.push(e)
}

function listMdx(locale: 'tr' | 'en'): Set<string> {
  return new Set(
    readdirSync(path.join(ROOT, 'content', locale), { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.split(path.sep).join('/')),
  )
}

async function main() {
  // 1. Pages: TR/EN pairs, the panel schema (frontmatter), bodies the panel can open (spec §3.4, §6).
  const tr = listMdx('tr')
  const en = listMdx('en')
  for (const f of tr) if (!en.has(f)) errors.push(`content/en/${f}: İngilizce karşılığı yok`)
  for (const f of en) if (!tr.has(f)) errors.push(`content/tr/${f}: Türkçe karşılığı yok`)
  for (const [slug] of PAGES) {
    for (const locale of ['tr', 'en'] as const) {
      const file = `content/${locale}/pages/${slug}.mdx`
      try {
        const page = await singletons[pageKey(locale, slug)].readOrThrow({ resolveLinkedFiles: true })
        errors.push(...mdxBodyErrors(String(page.body), file))
      } catch (e) {
        errors.push(readerErrorTr(e, file))
      }
    }
  }

  // 2. News: schema (index.yaml), both texts present, bodies the panel can open, photos present (spec §5.2).
  const slugs = await reader.collections.news.list()
  for (const slug of slugs) {
    const dir = `content/news/${slug}`
    const entry = await reader.collections.news.readOrThrow(slug).catch((e: unknown) => {
      errors.push(readerErrorTr(e, `${dir}/index.yaml`))
      return null
    })
    if (!entry) continue
    // The reader checks only the YYYY-MM-DD shape; a quoted "2026-02-30" passes it (spec §5.2: the date must be real).
    const day = new Date(entry.date)
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== entry.date) {
      errors.push(`${dir}/index.yaml: date "${entry.date}" gerçek bir tarih değil`)
    }
    for (const locale of ['tr', 'en'] as const) {
      const file = `${dir}/${locale}.mdx`
      const body = await entry[locale]()
      if (body.trim() === '') errors.push(`${file}: boş; her haberin iki dilde metni olmalı`)
      errors.push(...mdxBodyErrors(body, file))
      for (const p of bodyImagePaths(body)) checkAsset(file, p)
    }
  }

  // 3. Slides (spec §5.3): the rules ran when lib/slides loaded; here the photo files.
  const slides = getSlides('tr')
  for (const s of slides) if (s.type === 'static' && s.image) checkAsset(`content/home/slides.json (slayt "${s.id}")`, s.image)

  // 4. UI strings (spec §5.4).
  errors.push(...checkMessages(trMessages, enMessages))

  // 5. The JSON singletons through the panel schema; site documents and gallery photos on disk (spec §5.5, §5.6).
  for (const [key, file] of Object.entries(DATA_SINGLETONS)) {
    try {
      await singletons[key].readOrThrow({ resolveLinkedFiles: true })
    } catch (e) {
      errors.push(readerErrorTr(e, file))
    }
  }
  for (const d of site.documents) checkAsset(`content/site.json (belge "${d.title.tr}")`, d.file, false)
  const gallery = listGalleryImages('tr')
  for (const g of gallery) checkAsset('content/gallery.json', g.src)

  if (errors.length > 0) {
    console.error('check-content: içerik hataları\n' + errors.map((e) => `  ${e}`).join('\n'))
    process.exit(1)
  }
  console.log(
    `check-content: ${tr.size} sayfa (TR/EN), ${slugs.length} haber, ${slides.length} slayt, ${gallery.length} galeri fotoğrafı, ${site.documents.length} belge; arayüz metinleri eşleşiyor.`,
  )
}

main().catch((e) => {
  console.error(`check-content: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
