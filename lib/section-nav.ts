// lib/section-nav.ts
import { getTranslations } from 'next-intl/server'
import { ORG_NAV } from '@/lib/nav'

export async function competitionsSectionNav(): Promise<{ href: string; label: string }[]> {
  const t = await getTranslations('nav')
  return [
    { href: '/yarismalar', label: t('calendar') },
    { href: '/yarismalar/ilk-yarismam', label: t('firstCompetition') },
    { href: '/yarismalar/sss', label: t('faq') },
    { href: '/yarismalar/ebeveynler-icin', label: t('forParents') },
  ]
}

export async function organizationSectionNav(): Promise<{ href: string; label: string }[]> {
  const t = await getTranslations('nav')
  return ORG_NAV.map(({ href, key }) => ({ href, label: t(key) }))
}
