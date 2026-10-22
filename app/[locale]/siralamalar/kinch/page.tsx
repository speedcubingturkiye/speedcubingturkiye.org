// app/[locale]/siralamalar/kinch/page.tsx: Kinch (spec 2026-10-22), against the national records
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { AllRoundView } from '@/components/AllRoundView'
import { getKinch } from '@/lib/all-round'
import { pageMeta } from '@/lib/metadata'
import type { SearchParamsRecord } from '@/lib/rankings-view'
import { KINCH_HREF } from '@/lib/wca/rankings'

// Rendered per request (?sayfa, ?boyut, ?ara, ?il)
type Props = { searchParams: Promise<SearchParamsRecord> }

// A province's list waits for the members sheet's script (lib/il-ranking.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [locale, t, sp] = await Promise.all([getLocale(), getTranslations('rankings'), searchParams])
  const title = t.markup('kinchTitle', { en: (chunks) => chunks })
  const meta = pageMeta(locale, KINCH_HREF, { title: `${t('title')}: ${title}`, description: t('kinchDescription') })
  // A search result or a province's list is not a page of its own.
  return sp.ara || sp.il ? { ...meta, robots: { index: false } } : meta
}

export default async function KinchPage({ searchParams }: Props) {
  const [locale, data, sp] = await Promise.all([getLocale(), getKinch(), searchParams])
  return <AllRoundView mode="kinch" data={data} locale={locale} searchParams={sp} />
}
