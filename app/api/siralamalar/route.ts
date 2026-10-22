// app/api/siralamalar/route.ts: every row of one rankings list as JSON (2026-10-22). "Sıramı bul" fetches it once, on the
// box's first focus, and narrows the list in the browser on every key (components/RankingsSearch.tsx).
import { NextResponse, type NextRequest } from 'next/server'
import { getKinch, getSumOfRanks } from '@/lib/all-round'
import { narrowRows } from '@/lib/il-ranking'
import { allRoundListRows, eventListRows, parseListParam, type ListRow } from '@/lib/rankings-list'
import { getRankings } from '@/lib/wca/rankings'

// A province's list waits for the members sheet's script (lib/il-ranking.ts, SHEET_TIMEOUT_MS)
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const list = parseListParam(sp.get('liste') ?? '')
  if (!list) return NextResponse.json({ error: 'liste' }, { status: 400 })
  // Only the province narrows here; the search itself happens in the browser
  const il = sp.get('il') ?? ''
  let rows: ListRow[] | null = null
  if (list.mode === 'event') {
    const rankings = await getRankings(list.eventId, list.type)
    const narrowed = rankings && (await narrowRows(rankings.rows, { il }))
    rows = narrowed && !narrowed.unavailable ? eventListRows(narrowed.rows) : null
  } else {
    const data = list.mode === 'sum' ? await getSumOfRanks(list.type) : await getKinch()
    const narrowed = data && (await narrowRows(data.rows, { il }))
    rows = narrowed && !narrowed.unavailable ? allRoundListRows(narrowed.rows, list.mode === 'kinch') : null
  }
  if (!rows) return NextResponse.json({ error: 'veri' }, { status: 503 })
  // The national lists change only with a deploy; a province's list follows its members (gone within the hour, as the
  // privacy notice promises), so it is never kept
  return NextResponse.json({ rows }, { headers: { 'Cache-Control': il ? 'no-store' : 'public, max-age=0, s-maxage=3600' } })
}
