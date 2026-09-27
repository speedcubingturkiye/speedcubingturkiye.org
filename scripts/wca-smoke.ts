// scripts/wca-smoke.ts: pnpm exec tsx scripts/wca-smoke.ts
import { getCompetitions, getNextCompetition, getUpcomingWithDetails } from '@/lib/wca/competitions'
import { getRankings } from '@/lib/wca/rankings'

async function main() {
  const comps = await getCompetitions()
  console.log('competitions:', comps.length, '| newest:', comps[0]?.id, '| oldest:', comps.at(-1)?.id, comps.at(-1)?.start_date)

  const upcoming = await getUpcomingWithDetails()
  console.log(
    'upcoming:',
    upcoming.map(({ comp, detail }) => `${comp.id} spots_left=${detail?.spots_left} fee=${detail?.base_entry_fee_lowest_denomination}`),
  )

  const next = await getNextCompetition()
  console.log('next:', next?.comp.id ?? null)

  const single = await getRankings('333', 'single')
  console.log('333 single: rows', single?.rows.length, '| export', single?.exportDate, '| first:', single?.rows[0]?.best, single?.rows[0]?.personName)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
