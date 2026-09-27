// app/[locale]/siralamalar/[event]/[type]/page.tsx
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { RankingsView } from '@/components/RankingsView'
import { pageMeta } from '@/lib/metadata'
import type { SearchParamsRecord } from '@/lib/rankings-view'
import { getRankings, rankingsHref, TYPE_SEGMENT, type RankingType } from '@/lib/wca/rankings'
import { EVENTS } from '@/lib/wca/records'

type Props = { params: Promise<{ event: string; type: string }>; searchParams: Promise<SearchParamsRecord> }

// Rendered per request (?sayfa, ?boyut, ?ara). Only the 31 combinations from generateStaticParams exist (spec §5:
// 17 events, both types where an average exists); anything else is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return EVENTS.flatMap((e) =>
    (e.hasAverage ? (['single', 'average'] as RankingType[]) : (['single'] as RankingType[])).map((type) => ({
      event: e.id,
      type: TYPE_SEGMENT[type],
    })),
  )
}

function parse(params: { event: string; type: string }): { eventId: string; type: RankingType } {
  return { eventId: params.event, type: params.type === TYPE_SEGMENT.average ? 'average' : 'single' }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { eventId, type } = parse(await params)
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('rankings'), searchParams])
  const name = EVENTS.find((e) => e.id === eventId)?.name[locale] ?? eventId
  // rankingsHref maps 3x3x3 single to /siralamalar, so /siralamalar/333/tekli declares /siralamalar as its canonical URL.
  const meta = pageMeta(locale, rankingsHref(eventId, type), {
    title: `${t('title')}: ${name}, ${t(type)}`,
    description: t('description'),
  })
  // A search result is not a page of its own.
  return sp.ara ? { ...meta, robots: { index: false } } : meta
}

export default async function EventRankingsPage({ params, searchParams }: Props) {
  const { eventId, type } = parse(await params)
  const [locale, rankings, sp] = await Promise.all([getLocale(), getRankings(eventId, type), searchParams])
  return <RankingsView eventId={eventId} type={type} rankings={rankings} locale={locale} searchParams={sp} />
}
