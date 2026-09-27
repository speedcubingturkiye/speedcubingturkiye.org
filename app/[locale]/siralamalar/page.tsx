// app/[locale]/siralamalar/page.tsx: 3x3x3 single; the other events live under [event]/[type]
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { RankingsView } from '@/components/RankingsView'
import { pageMeta } from '@/lib/metadata'
import type { SearchParamsRecord } from '@/lib/rankings-view'
import { getRankings } from '@/lib/wca/rankings'

// Rendered per request: ?sayfa, ?boyut and ?ara pick what to show; the data is a file in the deployment.
type Props = { searchParams: Promise<SearchParamsRecord> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('rankings'), searchParams])
  const meta = pageMeta(locale, '/siralamalar', { title: t('title'), description: t('description') })
  // A search result is not a page of its own; the canonical stays the address without parameters.
  return sp.ara ? { ...meta, robots: { index: false } } : meta
}

export default async function RankingsPage({ searchParams }: Props) {
  const [locale, rankings, sp] = await Promise.all([getLocale(), getRankings('333', 'single'), searchParams])
  return <RankingsView eventId="333" type="single" rankings={rankings} locale={locale} searchParams={sp} />
}
