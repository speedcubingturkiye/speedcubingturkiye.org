// lib/wca/types.ts
export type WcaPerson = { id: number; name: string; wca_id: string | null }
export type CompetitionListItem = {
  id: string
  name: string
  city: string
  country_iso2: string
  start_date: string // 'YYYY-MM-DD'
  end_date: string // 'YYYY-MM-DD'
  registration_open: string // ISO datetime
  registration_close: string // ISO datetime
  announced_at: string
  competitor_limit: number | null
  event_ids: string[]
  url: string
  delegates: WcaPerson[]
  organizers: WcaPerson[]
}
export type CompetitionDetail = CompetitionListItem & {
  spots_left: number | null
  'registration_full?': boolean
  base_entry_fee_lowest_denomination: number | null
  currency_code: string
  venue: string
  venue_address: string | null
  venue_details: string | null
  latitude_degrees: number
  longitude_degrees: number
  tab_names: string[] | null
  scoretaking_software: string | null
}
/** One organizer tab of a WCA competition page (getCompetitionTabs); content is Markdown. */
export type WcaTab = { name: string; content: string; display_order: number }
/** getUpcomingWithDetails() item: detail is null when its request 404ed (or failed during the build). */
export type UpcomingCompetition = { comp: CompetitionListItem; detail: CompetitionDetail | null }
export type RegistrationStatus = 'past' | 'full' | 'open' | 'opens_soon' | 'closed'
/** One line of the Türkiye ranking (getRankings); pos is the national rank (ties share the lower rank). */
export type RankingRow = { pos: number; personId: string; personName: string; best: number }
