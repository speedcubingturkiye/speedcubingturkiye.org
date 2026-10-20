// app/api/bulten/liste/route.ts: the Secretary's newsletter tab (spec 2026-10-20 §B). The members sheet's script
// (scripts/uyelik-apps-script.gs, refreshNewsletter) posts the addresses ticked "Sil" with the shared secret and writes
// the list it gets back.
import type { NextRequest } from 'next/server'
import { authorized } from '@/lib/cron-auth'
import { refreshForSheet } from '@/lib/newsletter-sheet'

// SES takes one contact call a second: up to 40 deletions, then the listing
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const secret = process.env.MEMBERSHIP_SCRIPT_SECRET
  if (!secret || !authorized(request.headers.get('authorization'), secret)) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json().catch(() => null)) as { sil?: unknown } | null
  try {
    return Response.json({ aboneler: await refreshForSheet(body?.sil) })
  } catch (e) {
    console.error('newsletter tab refresh failed:', e instanceof Error ? e.name : String(e))
    return new Response('Error', { status: 500 })
  }
}
