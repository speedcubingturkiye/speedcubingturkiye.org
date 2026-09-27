// components/HomeHero.tsx: server side: turns content/home/slides.json plus the next competition into carousel slides
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { HeroCarousel, type HeroSlide } from '@/components/HeroCarousel'
import { getSlides } from '@/lib/slides'
import { displayCity } from '@/lib/wca/city'
import { formatDateRange } from '@/lib/wca/format'
import { registrationStatus, spotsTaken } from '@/lib/wca/status'
import type { UpcomingCompetition } from '@/lib/wca/types'

export async function HomeHero({ next, locale }: { next: UpcomingCompetition | null; locale: Locale }) {
  const t = await getTranslations('home')
  const tc = await getTranslations('competitions')
  const slides = getSlides(locale).flatMap((s): HeroSlide[] => {
    if (s.type === 'static') {
      return [
        {
          id: s.id,
          title: s.title,
          lead: s.lead,
          image: s.image,
          layout: s.layout,
          focus: s.focus,
          alt: s.alt,
          // https:// buttons open in a new tab; site paths get their locale prefix from the Link (lib/slides rules)
          actions: s.actions.map((a) => ({ ...a, external: a.href.startsWith('https://') })),
        },
      ]
    }
    if (!next) return [] // spec §4.2: no upcoming competition, no slide
    const { comp, detail } = next
    const status = registrationStatus(comp, detail)
    const taken = detail ? spotsTaken(detail) : null
    return [
      {
        id: s.id,
        // No kicker above the title (craft floor); "Sıradaki yarışma" names the slide for screen readers instead
        label: t('nextCompetition'),
        title: comp.name,
        dataTitle: true,
        meta: `${formatDateRange(comp.start_date, comp.end_date, locale)} · ${displayCity(comp.city)}`,
        status: tc(`status.${status}`),
        // Both numbers from the detail, as on the cards and rows (the list and detail endpoints are cached separately)
        capacity: taken != null ? tc('spotsOf', { taken, limit: detail?.competitor_limit ?? 0 }) : undefined,
        actions: [
          status === 'open'
            ? { label: tc('registerWca'), href: `${comp.url}/register`, variant: 'solid', external: true }
            : { label: t('competitionPage'), href: `/yarismalar/${comp.id}`, variant: 'solid' },
          { label: t('upcomingAll'), href: '/yarismalar', variant: 'outline' },
        ],
      },
    ]
  })
  return <HeroCarousel slides={slides} />
}
