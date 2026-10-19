// lib/section-nav.ts
import { getTranslations } from 'next-intl/server'
import { COMPETITIONS_NAV, ORG_NAV } from '@/lib/nav'

export async function competitionsSectionNav(): Promise<{ href: string; label: string }[]> {
  const t = await getTranslations('nav')
  return COMPETITIONS_NAV.map(({ href, key }) => ({ href, label: t(key) }))
}

export async function organizationSectionNav(): Promise<{ href: string; label: string }[]> {
  const t = await getTranslations('nav')
  return ORG_NAV.map(({ href, key }) => ({ href, label: t(key) }))
}
