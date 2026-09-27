import type { NextRequest } from 'next/server'
import { announceNew } from '@/lib/announce'
import { authorized } from '@/lib/cron-auth'
import { cleanupPending } from '@/lib/newsletter'

// Mailing every subscriber takes time (10 mails per second): the Hobby maximum.
export const maxDuration = 300

// Reads headers → always dynamic, never cached. Vercel sends `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || !authorized(request.headers.get('authorization'), secret)) {
    return new Response('Unauthorized', { status: 401 })
  }
  // next dev may hold production keys (.env.local): a local run never commits, mails or deletes.
  const dry = request.nextUrl.searchParams.get('dry') === '1' || process.env.NODE_ENV === 'development'
  const result = await announceNew({ dry })
  // Unconfirmed addresses older than 7 days go (spec §5); -1 marks a failed cleanup in the run's JSON.
  const pendingRemoved = dry
    ? 0
    : await cleanupPending().catch((e: unknown) => {
        console.error('pending cleanup failed:', e instanceof Error ? e.name : String(e))
        return -1
      })
  // 500 marks the run as failed in Vercel's cron log; failed ids are retried on the next run.
  const status = result.failed.length > 0 || result.wcaUnavailable ? 500 : 200
  return Response.json({ dry, ...result, pendingRemoved }, { status })
}
