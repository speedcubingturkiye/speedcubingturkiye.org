// components/HeroCarousel.tsx: the homepage's red hero (spec §4.2) on the WAI-ARIA APG carousel pattern, with the
// per-slide photo layouts of the editor spec §3.3 (mark, A, D, E, G, J).
'use client'

import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Focus, Layout } from '@/lib/content-rules'
import { titleFit } from '@/lib/title-fit'
import { BrandText } from '@/components/BrandText'
import { Logo } from '@/components/Logo'

export type HeroAction = { label: string; href: string; variant: 'solid' | 'outline'; external?: boolean }
export type HeroSlide = {
  id: string
  /** read before "2 / 3" in the slide's accessible name, e.g. "Sıradaki yarışma"; never shown */
  label?: string
  title: string
  /** the title is data (the next competition's WCA name): it keeps its own case instead of the uppercase display (R8) */
  dataTitle?: boolean
  lead?: string
  /** next-competition slide: "31 Ekim – 1 Kasım 2026 · İstanbul" */
  meta?: string
  /** next-competition slide: localized registration status, e.g. "Kayıt açık" */
  status?: string
  /** next-competition slide: "45/90" */
  capacity?: string
  actions: HeroAction[]
  /** /images/slides/<file>; drawn by `layout` (never for "mark") */
  image?: string
  layout?: Layout
  /** object-position of the photo */
  focus?: Focus
  /** photo description; empty or missing = decorative (alt="") */
  alt?: string
}

const INTERVAL_MS = 7000
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const CONTROL = 'inline-flex h-10 w-10 items-center justify-center border border-white/80 hover:border-white'
const button = (variant: HeroAction['variant']) => (variant === 'solid' ? 'btn btn-white' : 'btn btn-white-outline')

// The layout a slide is drawn with: a photo layout without a photo falls back to the mark.
const layoutOf = (s: HeroSlide): Layout => (s.image ? (s.layout ?? 'mark') : 'mark')

// The active slide and the furthest one shown so far: photos mount one slide ahead of it, because hidden slides share
// the viewport and native lazy loading would fetch every slide's photo on the first view.
type View = { index: number; reach: number }
const view = (v: View, index: number): View => ({ index, reach: Math.max(v.reach, index) })

// Photo placement per layout (editor spec §3.3). Below lg the photo sits above the text, band wide: the negative margins
// cancel the container's px-4 and py-10/py-14. Its height is capped at 28svh: all slides share the band's height, so a
// tall photo would stretch every slide and push the controls out of the first screen (phones up to 1023px windows;
// with the longest lead, 30svh leaves 4px at 1000x700 and 35svh already hides them at 375x667). The width is explicit:
// on an auto width, the aspect ratio would carry the height cap over to the width and narrow the photo.
// From lg, A and E fill the band's right 44vw, D its right 54vw, G the whole band and J the top max(296px, 40vh) (about
// 57% of the band). calc(50% - 50vw) measures from the containing block's edge to the viewport edge, so the photo reaches
// the band edge whether it is absolutely positioned (container padding box) or in flow (slide width); the band's
// overflow-hidden clips the half-scrollbar overshoot.
const PHONE = 'relative -mx-4 -mt-10 overflow-hidden max-lg:w-[calc(100%_+_2rem)] max-lg:max-h-[28svh] md:-mt-14'
const RIGHT = 'lg:absolute lg:inset-y-0 lg:right-[calc(50%_-_50vw)] lg:m-0 lg:aspect-auto'
const PHOTO: Record<Exclude<Layout, 'mark'>, string> = {
  A: `${PHONE} aspect-[16/10] ${RIGHT} lg:w-[44vw]`,
  // D: A's photo with a pointed edge. Below lg the bottom edge is a shallow V across the full width: from both bottom
  // corners, a third of the photo's height up, to a point at the bottom centre. Percentages of the photo box keep the
  // depth at a third at every capped height (the user chose this over a 45° V, which left almost a triangle of the low
  // photo). From lg the photo takes the band's right 54vw, the sketch's share, because the point cuts half the band
  // height out of its left side (in A's 44vw box too little photo was left), and the point's tip is that box's left
  // edge. The wrapper is then a size container, and the img's clip takes 50cqh (half the band height) as the point's
  // depth: 45° at any band height.
  D: `${PHONE} aspect-[16/10] [clip-path:polygon(0_0,100%_0,100%_66.667%,50%_100%,0_66.667%)] ${RIGHT} lg:w-[54vw] lg:[clip-path:none] lg:[container-type:size]`,
  E: `${PHONE} aspect-[16/10] ${RIGHT} lg:w-[44vw]`,
  G: 'absolute inset-y-0 inset-x-[calc(50%_-_50vw)] overflow-hidden',
  J: `${PHONE} aspect-[16/10] lg:aspect-auto lg:h-[max(296px,40vh)] lg:mx-[calc(50%_-_50vw)]`,
}
// The img's own classes. E and G: a grayscale photo under a red multiply layer. Multiplying only darkens the red, so
// white text keeps at least the contrast it has on plain #E30A17; G is darkened further because the text sits on it.
const IMG: Partial<Record<Layout, string>> = {
  D: 'lg:[clip-path:polygon(50cqh_0,100%_0,100%_100%,50cqh_100%,0_50%)]',
  E: 'grayscale',
  G: 'grayscale brightness-[.85] contrast-[1.3]',
}
// next/image's sizes: the photo's rendered width from lg (the lg:w-* classes in PHOTO)
const SIZES: Partial<Record<Layout, string>> = {
  A: '(min-width: 1024px) 44vw, 100vw',
  D: '(min-width: 1024px) 54vw, 100vw',
  E: '(min-width: 1024px) 44vw, 100vw',
}
const TINTED = new Set<Layout>(['E', 'G'])
const SHOWS_MARK = new Set<Layout>(['mark', 'G'])
// The text block is an inline-size container, so the title sizes itself to its own column (TITLE). A and E leave the
// band's right 44vw to the photo and D its right 54vw: the text column stops 40px before the photo, so D's text never
// meets the point. J splits the red strip 3:2. Below lg, G's text starts on the same line as the stacked layouts':
// their photo's height (16:10 of the band width, at most 28svh) plus their 1.5rem gap, less the band padding their
// photo's negative margin cancels (2.5rem, 3.5rem from md). A margin's percentage is of the slide's width.
const TEXT: Record<Layout, string> = {
  mark: 'relative [container-type:inline-size]',
  G: 'relative [container-type:inline-size] max-md:mt-[calc(min((100%_+_2rem)*10/16,28svh)_-_1rem)] md:max-lg:mt-[calc(min((100%_+_2rem)*10/16,28svh)_-_2rem)]',
  A: 'relative [container-type:inline-size] mt-6 lg:mt-0 lg:max-w-[calc(50%_+_6vw_-_2.5rem)]',
  D: 'relative [container-type:inline-size] mt-6 lg:mt-0 lg:max-w-[calc(50%_-_4vw_-_2.5rem)]',
  E: 'relative [container-type:inline-size] mt-6 lg:mt-0 lg:max-w-[calc(50%_+_6vw_-_2.5rem)]',
  J: 'relative [container-type:inline-size] mt-6 lg:mt-8 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-x-8',
}
// Title size (R6/R7): the breakpoint's display size, but never larger than lets the title's longest word fit its
// column, 100cqw over that word's em budget (--fit, from titleFit). Below 640px the size follows the viewport (R6).
// From lg the photo layouts use a smaller display size; J's title column is 3/5 of its strip after the 2rem gap.
const TITLE = 't-display [font-size:min(clamp(40px,7vw,96px),100cqw/var(--fit))] max-sm:[font-size:min(40px,9vw,100cqw/var(--fit))]'
const TITLE_LG: Partial<Record<Layout, string>> = {
  A: 'lg:[font-size:min(64px,4.2vw,100cqw/var(--fit))]',
  D: 'lg:[font-size:min(64px,4.2vw,100cqw/var(--fit))]',
  E: 'lg:[font-size:min(64px,4.2vw,100cqw/var(--fit))]',
  J: 'lg:[font-size:min(64px,4.2vw,(100cqw_-_2rem)*.6/var(--fit))]',
}

function Photo({ slide, layout, first, mount }: { slide: HeroSlide; layout: Layout; first: boolean; mount: boolean }) {
  if (layout === 'mark' || !slide.image) return null
  return (
    <div className={PHOTO[layout]}>
      {/* The wrapper always renders, so the band never waits for a photo to size itself. The first slide's photo is
          preloaded (Next 16 replaced `priority` with `preload`); the others mount one slide ahead of their turn, at low
          priority so they never compete with it. alt="" marks an undescribed photo as decorative. */}
      {mount && (
        <>
          <Image
            src={slide.image}
            alt={slide.alt ?? ''}
            fill
            sizes={SIZES[layout] ?? '100vw'}
            preload={first}
            fetchPriority={first ? undefined : 'low'}
            className={`object-cover ${IMG[layout] ?? ''}`}
            style={{ objectPosition: slide.focus ?? 'center' }}
          />
          {TINTED.has(layout) && <div aria-hidden="true" className="absolute inset-0 bg-brand mix-blend-multiply" />}
        </>
      )}
    </div>
  )
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations('home.carousel')
  const [{ index, reach }, show] = useReducer(view, { index: 0, reach: 0 })
  const [playing, setPlaying] = useState(true) // the rotation control's state; its label names the next action (APG)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false) // keyboard focus inside the carousel
  // Server snapshot false, real value after hydration: no mismatch, and it follows OS changes live.
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => matchMedia(REDUCED_MOTION).matches, () => false)
  const total = slides.length
  const rotating = playing && !hovered && !focused && !reducedMotion && total > 1
  const go = (i: number) => show((i + total) % total)
  const activeLayout = slides[index] ? layoutOf(slides[index]) : 'mark'

  // Keyed on index: every slide change, manual or automatic, restarts the 7 s count.
  useEffect(() => {
    if (!rotating) return
    const id = setTimeout(() => show((index + 1) % total), INTERVAL_MS)
    return () => clearTimeout(id)
  }, [rotating, index, total])

  // ←/→ on the controls only: on a slide's link, the slide holding the focused link would be hidden under it.
  // With a modifier it is a browser shortcut (Alt+← is Back), not ours.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    go(index + (e.key === 'ArrowRight' ? 1 : -1))
  }

  // Rotation pauses while the pointer is over the band or keyboard focus is inside it (APG). Chrome and Firefox also
  // focus a clicked button; checking :focus-visible keeps a mouse click on "start" from holding the rotation paused.
  return (
    <section
      aria-roledescription={t('roleCarousel')}
      aria-label={t('label')}
      className="relative overflow-hidden bg-brand text-white [&_:focus-visible]:outline-white"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(e) => {
        if (e.target.matches(':focus-visible')) setFocused(true)
      }}
      onBlur={(e) => {
        // A window or tab switch blurs with focus still on the element: keep the pause, or rotation would make it inert.
        if (document.activeElement !== e.target && !e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      {/* Desktop: the white mark's cube bleeds off the right and bottom edges (spec §4.2), but the crescent and star, a
          national symbol, always sit whole inside the band, ≥31px from its right and bottom edges (measured at every
          width from 1024px; the mark is anchored to the band's corner, so the margins do not change with the width).
          It never shares pixels with text, whatever the content: horizontally it starts right of the lg:max-w-md column
          under the title. It shows for the "mark" and "G" layouts of the active slide only; z-10 keeps it above G's
          photo, which lives inside the container. */}
      <div aria-hidden="true" className={`pointer-events-none absolute -bottom-11 -right-6 z-10 hidden ${SHOWS_MARK.has(activeLayout) ? 'lg:block' : ''}`}>
        <Logo variant="mark" tone="inverted" className="h-80 w-auto" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col justify-between px-4 py-10 md:min-h-[max(520px,70vh)] md:py-14">
        {/* APG: the rotation control comes first in the Tab sequence, before the rotating content; order-last still
            shows the row bottom-left (spec §4.2). relative z-10: G's photo is positioned and comes later in the tree,
            so without a z-index it would paint over the controls and take their clicks. */}
        {total > 1 && (
          <div className="relative z-10 order-last mt-10 flex items-center gap-2" onKeyDown={onKeyDown}>
            {/* No auto-rotation under reduced motion, so no rotation control either */}
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? t('pause') : t('play')}
              className={`${CONTROL} mr-2 motion-reduce:hidden`}
            >
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5l12 7-12 7z" />
                </svg>
              )}
            </button>
            <button type="button" onClick={() => go(index - 1)} aria-label={t('prev')} className={CONTROL}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            {/* 24px targets (WCAG 2.5.8) around the logo's 45° square: outlined, filled white for the current slide.
                2px outline: a 1px diagonal edge antialiases to under 3:1 on the red at 1x (WCAG 1.4.11). */}
            <ul className="flex items-center">
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={t('goTo', { n: i + 1, total })}
                    aria-current={i === index ? 'true' : undefined}
                    className="group grid h-6 w-6 place-items-center"
                  >
                    <span className="sq h-2.5 w-2.5 border-2 border-white bg-transparent group-aria-[current]:bg-white" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => go(index + 1)} aria-label={t('next')} className={CONTROL}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* No mark above the title on phones: the header shows it directly above the band. aria-live is off while
            rotating (APG) and polite once rotation stops. All slides share one grid cell, so the band keeps the
            tallest slide's height (photo included) and rotation never moves the page below it. */}
        <div aria-live={rotating ? 'off' : 'polite'} className="grid">
          {slides.map((s, i) => {
            const layout = layoutOf(s)
            return (
              <div
                key={s.id}
                role="group"
                aria-roledescription={t('roleSlide')}
                aria-label={[s.label, t('slideLabel', { n: i + 1, total })].filter(Boolean).join(', ')}
                inert={i !== index}
                // Without JS only slide 1 shows. Every slide shares grid cell 1/1, so the band is as tall as its tallest
                // slide. Whole literals only: Tailwind skips a class glued to `${`, and without row-start-1 the slides
                // stacked and the band grew to their sum.
                className={i === index ? 'col-start-1 row-start-1' : 'col-start-1 row-start-1 invisible'}
              >
                <Photo slide={s} layout={layout} first={i === 0} mount={i <= reach + 1} />
                {/* Adding .slide-in to the newly active slide's text restarts the entrance. The photo cuts in like the
                    mark: the animation's transform would make this slide the containing block of an absolute photo
                    (A/D/E from lg, G) for its 400ms, shrinking the photo to the slide's box until it snaps back. */}
                <div className={`${TEXT[layout]}${i === index ? ' slide-in' : ''}`}>
                  <h2
                    className={[s.dataTitle && 'normal-case', TITLE, TITLE_LG[layout]].filter(Boolean).join(' ')}
                    style={{ '--fit': titleFit(s.title) } as React.CSSProperties}
                  >
                    <BrandText>{s.title}</BrandText>
                  </h2>
                  <div className={layout === 'J' ? '' : 'lg:max-w-md'}>
                    {/* J: the lead's top lines up with the title's, as in the approved sketch */}
                    {s.lead && <p className={`${layout === 'J' ? 'lg:mt-0 ' : ''}mt-5 max-w-xl text-lg leading-relaxed`}>{s.lead}</p>}
                    {(s.meta || s.status || s.capacity) && (
                      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                        {s.meta && <span>{s.meta}</span>}
                        {s.status && <span className="t-label border border-white pt-[5px] pr-2 pb-[3px] pl-[calc(0.5rem+0.08em)]">{s.status}</span>}
                        {s.capacity && <span>{s.capacity}</span>}
                      </p>
                    )}
                    <div className="mt-8 flex flex-wrap gap-3">
                      {s.actions.map((a) =>
                        a.external ? (
                          <a key={a.href} href={a.href} rel="noopener noreferrer" target="_blank" className={button(a.variant)}>
                            {a.label}
                          </a>
                        ) : (
                          <Link key={a.href} href={a.href} className={button(a.variant)}>
                            {a.label}
                          </Link>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
