// app/[locale]/yarismalar/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { CompetitionDetailView } from '@/components/CompetitionDetailView'
import { pageMeta } from '@/lib/metadata'
import { displayCity } from '@/lib/wca/city'
import { getCompetition, getUpcomingWithDetails } from '@/lib/wca/competitions'
import { formatDateRange } from '@/lib/wca/format'

type Props = { params: Promise<{ id: string }> }

// Upcoming ids are prerendered; any other id (past competitions) is rendered on first request and cached.
export const dynamicParams = true

// Runs once per locale from the layout's generateStaticParams; must always return an array.
export async function generateStaticParams() {
  return (await getUpcomingWithDetails()).map(({ comp }) => ({ id: comp.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [locale, comp] = await Promise.all([getLocale(), getCompetition(id)])
  if (!comp) return {}
  return pageMeta(locale, `/yarismalar/${comp.id}`, {
    title: comp.name,
    description: `${displayCity(comp.city)} · ${formatDateRange(comp.start_date, comp.end_date, locale)}`,
  })
}

export default async function CompetitionPage({ params }: Props) {
  const { id } = await params
  const [locale, comp] = await Promise.all([getLocale(), getCompetition(id)])
  if (!comp) notFound()
  return <CompetitionDetailView comp={comp} locale={locale} />
}
