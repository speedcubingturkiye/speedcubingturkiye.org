// app/[locale]/siralamalar/toplam/[type]/page.tsx: the Sum of Ranks (spec 2026-10-22), single and average
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { AllRoundView } from '@/components/AllRoundView'
import { getSumOfRanks } from '@/lib/all-round'
import { pageMeta } from '@/lib/metadata'
import type { SearchParamsRecord } from '@/lib/rankings-view'
import { sumOfRanksHref, TYPE_SEGMENT, typeFromSegment, type RankingType } from '@/lib/wca/rankings'

type Props = { params: Promise<{ type: string }>; searchParams: Promise<SearchParamsRecord> }

// Rendered per request (?sayfa, ?boyut, ?ara, ?il); only tekli and ortalama exist, anything else is a 404.
export const dynamicParams = false
// A province's list waits for the members sheet's script (lib/il-ranking.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export function generateStaticParams() {
  return Object.values(TYPE_SEGMENT).map((type) => ({ type }))
}

// An unknown type is a 404 (lib/wca/rankings.ts, eventPage: dynamicParams alone does not hold here)
const parse = async (params: Props['params']): Promise<RankingType> => typeFromSegment((await params).type) ?? notFound()

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const type = await parse(params)
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('rankings'), searchParams])
  const meta = pageMeta(locale, sumOfRanksHref(type), {
    title: `${t('title')}: ${t('sumTitle')}, ${t(type)}`,
    description: t('sumDescription'),
  })
  // A search result or a province's list is not a page of its own.
  return sp.ara || sp.il ? { ...meta, robots: { index: false } } : meta
}

export default async function SumOfRanksPage({ params, searchParams }: Props) {
  const type = await parse(params)
  const [locale, data, sp] = await Promise.all([getLocale(), getSumOfRanks(type), searchParams])
  return <AllRoundView mode="sum" type={type} data={data} locale={locale} searchParams={sp} />
}
