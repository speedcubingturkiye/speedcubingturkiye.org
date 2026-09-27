import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import type { Locale } from '@/i18n/routing'
import { pageMeta } from '@/lib/metadata'
import { readNews, type NewsFrontmatter } from '@/lib/news'
import { mdxComponents } from '@/components/mdx-components'

// News data and listing come from lib/news.ts (Keystatic reader); this module only compiles MDX.
export { listNews } from '@/lib/news'
export type { NewsFrontmatter } from '@/lib/news'

export type PageFrontmatter = { title: string; description: string; updated?: string }

const CONTENT_DIR = path.join(process.cwd(), 'content')
const MDX_OPTIONS = { remarkPlugins: [remarkGfm] }

// YAML turns an unquoted 2026-09-25 into a Date; normalise both forms to 'YYYY-MM-DD'.
function isoDate(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && v) return v
  return undefined
}

function pageFrontmatter(raw: Record<string, unknown>, file: string): PageFrontmatter {
  if (typeof raw.title !== 'string' || !raw.title) throw new Error(`${file}: frontmatter "title" is required`)
  return {
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    updated: isoDate(raw.updated),
  }
}

export const getPage = cache(
  async (locale: Locale, slug: string): Promise<{ frontmatter: PageFrontmatter; content: ReactNode } | null> => {
    const file = path.join(CONTENT_DIR, locale, 'pages', `${slug}.mdx`)
    if (!existsSync(file)) return null
    const source = await readFile(file, 'utf8')
    const { content, frontmatter } = await compileMDX<Record<string, unknown>>({
      source,
      options: { parseFrontmatter: true, mdxOptions: MDX_OPTIONS },
      components: mdxComponents,
    })
    return { frontmatter: pageFrontmatter(frontmatter, file), content }
  },
)

export const getNews = cache(
  async (locale: Locale, slug: string): Promise<{ frontmatter: NewsFrontmatter; content: ReactNode } | null> => {
    const news = await readNews(locale, slug)
    if (!news) return null
    // The body is a bare MDX file (its data lives in index.yaml): no frontmatter to parse.
    const { content } = await compileMDX({ source: news.source, options: { mdxOptions: MDX_OPTIONS }, components: mdxComponents })
    return { frontmatter: news.frontmatter, content }
  },
)

// generateMetadata helper for MdxPage routes: the URL path equals '/' + slug. Title/description come from the frontmatter.
export async function pageMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const page = await getPage(locale, slug)
  return page ? pageMeta(locale, `/${slug}`, page.frontmatter) : {}
}
