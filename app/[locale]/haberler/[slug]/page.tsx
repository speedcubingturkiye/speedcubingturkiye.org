import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getNews, listNews } from '@/lib/content'
import { pageMeta } from '@/lib/metadata'
import { formatDate } from '@/lib/wca/format'
import { Prose } from '@/components/Prose'

type Props = { params: Promise<{ slug: string }> }

// Unknown slugs 404 without touching the filesystem; new files ship with a new build.
export const dynamicParams = false

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!hasLocale(routing.locales, params.locale)) return []
  return (await listNews(params.locale)).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const news = await getNews(locale, slug)
  if (!news) return {}
  return pageMeta(locale, `/haberler/${slug}`, news.frontmatter)
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const locale = await getLocale()
  const news = await getNews(locale, slug)
  if (!news) notFound()
  const t = await getTranslations('news')
  const { title, description, date, category, auto } = news.frontmatter
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-sm text-fg-2">
        <time dateTime={date}>{formatDate(date, locale)}</time> · {t(`category.${category}`)}
        {auto && <> · {t('auto')}</>}
      </p>
      {/* A news title is data (a competition name in the cron's announcements, a domain in ours): it keeps its own
          case (R8) */}
      <h1 className="mt-2 normal-case">{title}</h1>
      {description && <p className="mt-3 text-lg text-fg-2">{description}</p>}
      <div className="mt-8">
        <Prose>{news.content}</Prose>
      </div>
      <p className="mt-10">
        <Link href="/haberler" className="t-label text-brand-ink hover:underline">
          {t('all')}
        </Link>
      </p>
    </article>
  )
}
