// lib/wca/competitions.ts
import { WCA_BASE, mapLimit, wcaFetch, wcaFetchWithHeaders } from './client'
import { DEMO_BASE, demoCompetition, isDemo } from './demo'
import { WCA_ID_RE, isOngoing, todayIstanbul } from './status'
import type { CompetitionDetail, CompetitionListItem, UpcomingCompetition, WcaPerson, WcaTab } from './types'

// include_cancelled=false: the API returns cancelled competitions by default (e.g. AnkaraJuly2026).
const LIST_PATH = '/api/v0/competitions?country_iso2=TR&include_cancelled=false&sort=-start_date&per_page=100'
const MAX_PAGES = 10

// The API sends more fields than we keep (delegates[].email is PII); pick explicitly.
const toPerson = (p: WcaPerson): WcaPerson => ({ id: p.id, name: p.name, wca_id: p.wca_id })

function toListItem(r: CompetitionListItem): CompetitionListItem {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    country_iso2: r.country_iso2,
    start_date: r.start_date,
    end_date: r.end_date,
    registration_open: r.registration_open,
    registration_close: r.registration_close,
    announced_at: r.announced_at ?? '',
    competitor_limit: r.competitor_limit ?? null,
    event_ids: r.event_ids,
    url: r.url,
    delegates: r.delegates.map(toPerson),
    organizers: r.organizers.map(toPerson),
  }
}

function toDetail(r: CompetitionDetail): CompetitionDetail {
  return {
    ...toListItem(r),
    spots_left: r.spots_left ?? null,
    'registration_full?': Boolean(r['registration_full?']),
    base_entry_fee_lowest_denomination: r.base_entry_fee_lowest_denomination ?? null,
    currency_code: r.currency_code,
    venue: r.venue,
    venue_address: r.venue_address ?? null,
    venue_details: r.venue_details ?? null,
    latitude_degrees: r.latitude_degrees,
    longitude_degrees: r.longitude_degrees,
    tab_names: r.tab_names ?? null,
    scoretaking_software: r.scoretaking_software ?? null,
  }
}

/** RFC 8288 Link header → path of rel="next", or null. */
function nextPath(link: string | null): string | null {
  const m = link?.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1].replace(WCA_BASE, '') : null
}

/** All non-cancelled TR competitions, newest first. Follows Link rel="next" (2 pages today). [] when a page is null (build-time failure). */
export async function getCompetitions(): Promise<CompetitionListItem[]> {
  const all: CompetitionListItem[] = []
  let path: string | null = LIST_PATH
  for (let page = 0; path && page < MAX_PAGES; page++) {
    const res = await wcaFetchWithHeaders<CompetitionListItem[]>(path, 3600)
    if (!res) return []
    all.push(...res.data.map(toListItem))
    path = nextPath(res.link)
  }
  return all.sort((a, b) => b.start_date.localeCompare(a.start_date))
}

export async function getCompetition(id: string): Promise<CompetitionDetail | null> {
  if (!WCA_ID_RE.test(id)) return null // trust boundary: id comes from the URL
  // Under next dev, the sample pages (lib/wca/demo.ts) are the base competition with other dates and spots
  const demo = isDemo(id)
  const raw = await wcaFetch<CompetitionDetail>(`/api/v0/competitions/${demo ? DEMO_BASE : id}`, 900)
  if (!raw) return null
  return demo ? demoCompetition(id, toDetail(raw)) : toDetail(raw)
}

/** The organizers' tabs of the WCA competition page, in display order; null when the request fails. */
export async function getCompetitionTabs(id: string): Promise<WcaTab[] | null> {
  if (!WCA_ID_RE.test(id)) return null // trust boundary: id comes from the URL
  const raw = await wcaFetch<WcaTab[]>(`/api/v0/competitions/${isDemo(id) ? DEMO_BASE : id}/tabs`, 900)
  if (!raw) return null
  return raw
    .map((t) => ({ name: t.name.trim(), content: t.content, display_order: t.display_order }))
    .sort((a, b) => a.display_order - b.display_order)
}

/**
 * Competitions with end_date >= today (ongoing + future), soonest first, each with its detail data.
 * Every list item is kept: a detail that came back null (404, or a failed request during the build) is `detail: null`
 * and the row renders from the list fields alone.
 */
export async function getUpcomingWithDetails(): Promise<UpcomingCompetition[]> {
  const today = todayIstanbul()
  const upcoming = (await getCompetitions())
    .filter((c) => c.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const details = await mapLimit(upcoming, 4, (c) => getCompetition(c.id))
  return upcoming.map((comp, i) => ({ comp, detail: details[i] }))
}

/** Ongoing competition if any, else the soonest upcoming one. Used by the hero pill and /live. */
export async function getNextCompetition(): Promise<UpcomingCompetition | null> {
  const upcoming = await getUpcomingWithDetails()
  return upcoming.find((u) => isOngoing(u.comp)) ?? upcoming[0] ?? null
}
