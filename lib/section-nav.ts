// lib/section-nav.ts
import { getTranslations } from 'next-intl/server'

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
  return [
    { href: '/organizasyon', label: t('about') },
    { href: '/organizasyon/tuzuk', label: t('bylaws') },
    { href: '/organizasyon/belgeler', label: t('documents') },
    { href: '/organizasyon/ilanlar', label: t('announcements') },
    { href: '/organizasyon/guvenli-ortam', label: t('safeguarding') },
    { href: '/organizasyon/goruntu-bildirimi', label: t('filmingNotice') },
    { href: '/organizasyon/gonullu-ol', label: t('volunteer') },
  ]
}
