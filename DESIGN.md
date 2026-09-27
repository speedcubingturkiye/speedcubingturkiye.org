---
name: Speedcubing Türkiye
description: Bilingual home of WCA speedcubing in Türkiye; national-red bands, square hairline planes, wide Archivo caps.
colors:
  turkiye-red: "#e30a17"
  red-ink: "#c4000f"
  red-ink-dark: "#ff4d57"
  paper: "#ffffff"
  paper-2: "#f4f4f2"
  ink: "#1a1a1a"
  ink-2: "#555555"
  hairline: "#e2e2e0"
  muted: "#666666"
  ink-band: "#1a1a1a"
  ok-green: "#147a3a"
  warn-amber: "#9a5b00"
  night: "#0f1012"
  night-2: "#17181b"
  night-fg: "#f2f2f2"
  night-fg-2: "#a9adb3"
  night-hairline: "#2a2c31"
  night-band: "#000000"
  night-ok: "#5bd08a"
  night-warn: "#e0a439"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(40px, 7vw, 96px)"
    fontWeight: 800
    lineHeight: 0.95
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(32px, 4.5vw, 56px)"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 125"
  headline-phone:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(24px, 8.5vw, 32px)"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 120"
  section:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 2.6vw, 36px)"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 120"
  section-phone:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(20px, 7.2vw, 28px)"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 115"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(20px, 1.6vw, 22px)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'tnum'"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 110"
  button:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 110"
rounded:
  none: "0px"
spacing:
  gutter: "16px"
  card: "20px"
  panel: "24px"
  section: "56px"
  container: "1152px"
components:
  button-brand:
    backgroundColor: "{colors.turkiye-red}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-white:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.turkiye-red}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-white-outline:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  panel:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.none}"
    padding: "{spacing.panel}"
  status-badge:
    backgroundColor: "transparent"
    textColor: "{colors.ok-green}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  nav-item:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    padding: "4px 0"
---

# Design System: Speedcubing Türkiye

## Overview

**Creative North Star: "The National Scoreboard"**

The site is the category standard for a WCA regional organization, built at full craft: Türkiye red laid down as full-bleed bands, white content planes between them, and a black footer. Everything is square, drawn with 1px hairlines and no shadow. Headings are Archivo pushed wide (110–125% width) and set in uppercase, like a sports scoreboard. Body text stays at normal width, and every number is tabular. The one ornament comes from the logo itself, the 45° tilted square, which serves as marker, divider and carousel indicator.

Density is calm and editorial: a 1152px container, 56px section padding, and cards that carry only the facts a competitor needs (date, name, city, events, status, spots). Dark mode turns the planes near-black but keeps the red bands red. The system rejects the SaaS template (rounded soft-shadow cards, stat strips, arrow-studded links, slogan heroes) and the dark hero with a neon or cyan glow.

**Key Characteristics:**
- Full-bleed red (`#e30a17`) bands alternate with white and warm-grey planes above a black footer; the red is identical in both themes.
- Zero radius and zero shadow everywhere; depth comes from bands and hairlines.
- Archivo, one family: wide uppercase headings, normal-width body, tabular numerals.
- The logo's 45° square is the only decorative device.
- Bilingual TR/EN: uppercase follows each word's `lang`.

## Colors

One loud national red against paper and ink. The red fills whole bands, and inside content it is only a marker or link accent.

### Primary
- **Türkiye Red** (turkiye-red): hero carousel band, closing follow/newsletter band, brand button, NR chip, active-tab underline, focus outline, text selection, `accent-color`. The same value in both themes.
- **Red Ink** (red-ink; red-ink-dark in dark mode): red as *text* on planes (section "all" links, card-title hover, step numbers, form errors, mobile active item). A darker red for AA on white and a lighter one on near-black.

### Neutral
- **Paper / Paper 2** (paper, paper-2): the main plane and the secondary plane (first-competition steps band, newsletter strip, callouts, details, empty and data-unavailable boxes).
- **Ink / Ink 2** (ink, ink-2): body text and secondary text (dates, cities, descriptions, inactive nav).
- **Hairline** (hairline): every border and divider.
- **Ink Band** (ink-band; night-band in dark mode): the footer. Text on it is white at 100/80/70/60% opacity, with dividers at white/15.
- **Night set** (night, night-2, night-fg, night-fg-2, night-hairline): the dark-theme values of the same roles, switched by `:root[data-theme="dark"]`.

### Status
- **OK Green / Warn Amber / Muted** (ok-green, warn-amber, muted, plus night-ok, night-warn): registration status as text and a 1px border only. "Full" uses the red border with red-ink text.

### Named Rules
**The Bands Stay Red Rule.** The dark theme changes planes, text and hairlines. It never changes the red bands, which keep white text, a white focus outline and light-scheme form controls.

**The Outline-Not-Tint Rule.** Status is never a tinted fill. It is always coloured text inside a 1px border of the same colour.

## Typography

**Display Font:** Archivo (variable weight and width axis, via next/font; fallback ui-sans-serif, system-ui)
**Body Font:** Archivo at normal width
**Label Font:** Archivo 700 at 110% width, uppercase, tracked

**Character:** One family, stretched wide for headings like a scoreboard and left at normal width for reading. It sounds sporty without shouting.

### Hierarchy
- **Display** (800, clamp(40px, 7vw, 96px), 0.95, 125% width, uppercase): hero slide titles only. Below 640px it follows the viewport at min(40px, 9vw), so it may go below 40px under 444px and "SPEEDCUBING" still fits whole.
- **Headline / h1** (800, clamp(32px, 4.5vw, 56px), 1, 125% width, uppercase): page titles. Below 640px: clamp(24px, 8.5vw, 32px) at 120% width.
- **Section / h2** (800, clamp(28px, 2.6vw, 36px), 1.05, 120% width, uppercase): section headings. Below 640px: clamp(20px, 7.2vw, 28px) at 115% width.
- **Title / h3** (700, clamp(20px, 1.6vw, 22px), 1.1): step titles, card titles.
- **Body** (400, 16px, 1.6, tabular numerals): text; the hero lead is 18px/relaxed at max-w-xl; MDX text uses a reading measure (max-w-prose / max-w-2xl).
- **Label** (700, 12px, 0.08em, 110% width, uppercase): nav items, table heads, badges, chips, footer column heads, dates on cards.
- **Date numerals** (800, 24px): the day number in the calendar date block.

### Named Rules
**The Language-Case Rule.** CSS uppercase follows the nearest `lang`. Any word in another language carries its own `lang` (the brand words through BrandText, English channel names, event names), so TÜRKİYE gets its dotted İ and DISCORD does not.

**The Data-Keeps-Its-Case Rule.** Competition names, news titles and other data titles are never uppercased or widened (`normal-case`, normal width), even in an h1 or in the hero.

**The Whole-Word Rule.** Our own headings never split a word. The phone h1/h2 sizes below 640px exist so the longest words we write fit a 320px column. `overflow-wrap: break-word` is only a last resort for data.

## Layout

A single centred container (max-width 1152px, 16px gutters). Bands are full-bleed and their content sits inside the container. Sections use 56px vertical padding (40px on inner pages and the newsletter strip). Section heads place the h2 and its "all" link in one row that wraps on phones, so the link never pushes the heading off-screen.

The homepage follows a fixed band rhythm: red hero carousel (min max(520px, 70vh) from 768px) → white upcoming competitions → paper-2 three first-competition steps → white news → red follow + newsletter. Grids go to three columns from 768px. A single item renders at full width (a lone competition becomes a calendar row, and a lone news card spans the band with its text kept to a reading measure), never as a lone one-third card.

Breakpoints are Tailwind defaults: 640px (phone type sizes end, long logo appears), 768px (grids, hero height), 1024px (hero logo mark, full desktop nav). The sticky header is 64px, and anchors get `scroll-margin-top: 5rem`.

## Elevation & Depth

Flat. The radius and shadow namespaces are removed from the theme (`--radius-*: initial; --shadow-*: initial`), so no rounded or shadow utility has any effect. Depth comes from band colour changes (red / white / black / paper-2) and 1px hairlines. The only translucency is the sticky header (bg at 95% with backdrop blur).

### Named Rules
**The No-Shadow Rule.** Nothing floats. Hover is shown by a border moving from hairline to ink, a colour change, or an outline button filling.

## Shapes

Square corners (0px) on every element: buttons, cards, inputs, badges, toggles, carousel controls. Borders are 1px hairlines, 2px on buttons, on the active tab and nav underline, and on the table-head rule. The recurring silhouette is the logo's 8px square rotated 45°: a list marker in callouts, and in outline and filled form as the carousel slide indicator. Markers are never round dots.

## Components

### Buttons
Square, confident, uppercase.
- **Shape:** 0px radius, 44px min height, 20px horizontal padding plus 2px on top (optical centring), 2px border in the fill or text colour, 13px label at 0.06em tracking, never wraps (except the one opted-in CTA inside a narrow box).
- **Variants:** brand (red fill, white text) for the primary action on planes; solid (ink fill) for secondary; outline (ink border) for tertiary. On red bands: white (white fill, red text) and white-outline.
- **Hover / Focus:** filled variants dim to `brightness(0.92)`, and outline variants fill in. Focus is a 2px red outline at 2px offset, which turns white on red bands. Pending submit uses `aria-disabled` at 60% opacity, so the button keeps focus.
- **Optical centring:** an uppercase label or a row of digits has no descenders, so centred in its line it sits about 1px high, and the tracking after its last letter pulls it left. Every box that holds one moves 1px of vertical padding from the bottom to the top (a button adds 2px on top of its centred label), and labels add their 0.08em tracking to the left padding; the calendar date block uses 5px over 11px, and the header items and section tabs count their 2px underline as bottom padding (8px over 4px, 13px over 11px; the menu rows 13px over 11px). Whole pixels, because text snaps to whole pixels: a 1.2px shift moved labels 2px. Measured at 4x, every box sits within 0.5px of its centre; İ, Ü, Ç and Ş move the ink bounds, not the cap body.

### Cards / Containers
- **Competition card / news card:** 1px hairline, 20px padding, square, full height in the grid. The border turns ink on hover. Competition cards run date label + status badge / h3 name / city / events + spots over a hairline rule.
- **Registration button:** a brand button to the WCA registration page, in the calendar rows, the home cards and the competition page: "WCA'da kayıt ol" while registration is open, "Bekleme listesine yazıl" while the competition is full but the window is still open (a new registration joins the waiting list). It wraps to two lines rather than overflow a 320px phone's status box.
- **Competition status box:** badge, registration window, spots and fee at the left; from 768px the buttons sit at the right, centred vertically (below them on narrower screens). The main button is always brand red: register, join the waiting list, the WCA page, or the results; WCA Live stays outlined.
- **Results button:** a past competition's status box holds only its badge and a brand "Sonuçlar" button to its WCA results.
- **Panels:** paper-2 fill with a hairline border and 24px padding, for callouts (red square marker before the title), details (red marker), empty states, data-unavailable boxes and attribution notes. The homepage newsletter box is one: under the upcoming list (or alone, worded as the empty state), a title and a line of text with a brand button, stacked on phones and a row from 640px.
- **Accordions (details):** the answer grows from nothing to its height in 250ms and shrinks back in 200ms when it closes (a one-row grid from 0fr to 1fr with a fade, CSS only, the mobile menu's timing), 12px from the question and from the bottom edge; instant under reduced motion. FAQ answers, the parents' page and the competition tabs share it.
- **Competition information:** the organizers' tabs from the WCA page as paper-2 accordions (the Details pattern), in the page's language (the Turkish or English part of each bilingual tab, marked [TR] / [EN] or Türkçe / English, and that half of its name), their Markdown in compact prose with the WCA's hard line breaks: headings at 16px bold, hairline rules, red underlined links that open in a new tab. Images show as links and raw HTML is dropped, so the page loads nothing from third-party hosts.
- **Newsletter pages:** the "link did not work" page and the unsubscribe page follow the article frame (h1, a lead in ink-2, max width 768px); the unsubscribe page shows the masked address and one brand button, and a status line in ok green or brand ink; with a bad link it shows the info@ address as a mail link instead.
- **Mails:** 600px column, system sans-serif, the mail logo at the top (`/brand/logo-mail.png`: the wordmark with a white outline so it stays readable when a mail app darkens the page; 600px shown at 300px) and a light-only colour scheme, h1 24px, red-ink underlined links, paper-2 bordered boxes for callouts, a hairline above a 13px ink-2 footer. The footer with the unsubscribe link belongs to news mails (announcements and newsletters); the confirmation mail's footer carries only the reason line. No tracking and no image from another host; the confirmation mail's button is a red block link.

### Chips and Badges
- **Status badge:** outlined label, 1px border in the status colour, 5px/3px vertical and 8px side padding (optical centring), never a fill.
- **Category chip:** 11px label, hairline border, secondary text colour.
- **NR chip:** red fill, white 11px label ("NR"), set solid (line-height 1) and nudged 1px up so it centers on the name, next to the national record holder.

### Inputs / Fields
- **Style:** 1px hairline border, paper background, 8px 12px padding, square. Labels are 14px semibold above the field.
- **Focus:** the border turns ink, plus the global red outline.
- **On red:** solid white border, transparent fill, white text, and a white `accent-color` checkbox forced to the light scheme.

### Navigation
- **Header:** sticky and 64px, with the logo (the mark only below 640px) at left. From 1024px there are four label-style items in ink-2 (Yarışmalar, Sıralamalar, Haberler, Organizasyon; no community page for now, the channels are in the footer and the home page's follow band), and the active item gets ink text and a 2px red underline. The language switch and the theme toggle sit at the right at every width; below 1024px a 36px square menu button (a `<details>`: a hamburger icon, a cross while open, drawn like the theme toggle's icons) joins them and opens a full-width panel that slides down from under the header's bottom border in 250ms and back up in 200ms when it closes (a transform transition the compositor runs, CSS only, none under reduced motion), holding only the items as hairline-divided rows (active item in red ink).
- **Language switch:** a 36px hairline square like the theme toggle, showing the other language's code (EN on Turkish pages, TR on English ones), no flags. The code is optically centred: padding offsets the label's letter-spacing after the last letter and the room caps leave for descenders. A switch keeps the scroll position and crossfades the whole page (a React view transition in the root layout, instant under reduced motion).
- **Segmented toggles:** hairline-bordered group, 36px items, the active item inverted (ink fill, paper text): the rankings single/average toggle and the per-page switch.
- **Section tabs:** horizontally scrolling label tabs with WCA event icons and a 2px red underline on the active tab. The active tab re-centres on navigation, and the scrollbar is a thin token-coloured bar.
- **Back link:** the competition page opens with a label-style "Tüm yarışmalar" link in ink-2 (ink on hover) led by the pager's left chevron: 14px, its stroke on the column edge, 6px from the label, and 1px up at the caps' optical centre.
- **Page navigation:** under a paged list (the rankings, the past competitions): previous and next plus page numbers in 40px hairline squares (the current page inverted), first and last page always shown, current ± 2 from 640px and ± 1 on phones, skipped pages as "…"; on phones previous and next are chevron squares instead of text (desktop keeps the text labels), and the phone row stays on one line down to 320px. The page lives in the URL (?sayfa), with no client JS, and the language switch keeps it. The competitions page shows 20 past competitions per page under their month headings, the upcoming ones on page 1 only, and its page links land on the past list's heading.
- **Footer:** black band with the inverted long logo, four label-headed link columns at white/80, and a hairline-divided legal row at 12px.
- **Channel links:** the brands' own single-colour marks (Instagram, YouTube, the Twitter bird for X, GitHub; from Simple Icons), filled, 20px, named by aria-label. The marks themselves are the links, with no frame: on the red follow band 28px white marks in 44px targets (white/75 on hover), the first lined up with the text above; in the footer they form one row of 36px targets under the contact links. A channel without a mark (Discord, WhatsApp, TikTok) shows its name, and a channel with no address is hidden.

### Hero Carousel (signature)
A full-bleed red band on the WAI-ARIA APG carousel pattern, where each slide takes one of six layouts. "mark" has no photo: from 1024px the white inverted logo mark bleeds off the bottom-right and never overlaps text. The mark shows only on "mark" and G. From 1024px, A fills the band's right 44vw with a hard-edged photo and ends the text column 40px before it; D widens the photo to the band's right 54vw and cuts its left edge to a point at an exact 45° (half the band height deep), with its text column ending 40px before the point; E is A with the photo toned red and black (grayscale under a red multiply layer); G spreads that tone over the whole band, darkened further (brightness .85, contrast 1.3) because the text sits on it; J runs the photo full width across the top (max(296px, 40vh)) above a red bar with the title on the left and the lead and buttons on the right (3:2). Below 1024px the photo sits band-wide above the text at 16:10, capped at 28svh, and D's bottom edge becomes a shallow full-width V a third of the photo deep; G stays a toned full background, its text starting on the same line as the other layouts' text. Only G puts text on a photo, and its multiply layer keeps white text at least as legible as on plain red. The controls sit bottom-left, in 40px square white-bordered buttons: a rotation button first in tab order whose label switches between pause and play, then previous, then 24px 45° square indicators (outlined, filled for the current slide), then next. Rotation runs every 7s and pauses on hover, on keyboard focus, and under reduced motion (the rotation button is hidden there). Slides share one grid cell so the band never changes height. Photos cut in; only the text block enters, with a 400ms slide-in. Each slide has an accessible name, with no visible label above the title. The next-competition slide keeps the WCA name in its own case.

### Rankings
The rankings pages use a table with a 2px ink rule under the label-style head, hairline rows and tabular numerals. Names wrap and are never truncated, and the first place carries the NR chip. Above the table sits a tools row: the "Sıramı bul" search (a GET form with a 14px semibold label, a hairline field and a brand (red) button) and the per-page switch (25 · 50 · 100 · 500), stacked on phones. A search filters the table itself to the matching competitors, who keep their national ranks; a "clear search" link sits at the end of the field's label line, and a search with no match shows a paper-2 note instead of the table. Below the table sits the page navigation (Navigation above). No client JS. The homepage shows no rankings; the pages are reached from the nav and the footer.

## Do's and Don'ts

### Do:
- **Do** use Türkiye Red as full-bleed bands with white type and a white focus outline, and keep them red in dark mode.
- **Do** keep every corner at 0px and every surface shadowless; show hover through border, colour or fill changes.
- **Do** use the 45° square (8px, `rotate(45deg)`) for markers and indicators.
- **Do** give foreign-language words their own `lang` so uppercase renders correctly (BrandText for "Speedcubing" and "Türkiye").
- **Do** keep data titles (competition names, news titles) in their own case and at normal width.
- **Do** switch h1/h2 to the phone sizes below 640px so our headings never split a word; the hero display may go below 40px under 444px.
- **Do** show the full desktop nav only from 1024px; below that the Menu panel carries the same links.
- **Do** render a single item at full width (a calendar row, or a card spanning the band).
- **Do** use tabular numerals for every date, rank, time and capacity.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; name a slide or section for screen readers instead.
- **Don't** add hero-metric cards or stat strips.
- **Don't** use round dots as markers or carousel indicators.
- **Don't** put a watermark or logo behind inner-page titles.
- **Don't** use rounded cards, soft shadows, a dark hero with a neon or cyan glow, or arrow-studded links.
- **Don't** tint status badges; use outline and text colour only.
- **Don't** use flags for languages: a flag names a country, not a language.
- **Don't** put red text directly on a red band or a red selection on red (selection inverts to white on `.bg-brand`).
