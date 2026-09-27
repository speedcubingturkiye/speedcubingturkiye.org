// app/api/bulten/gonder/route.ts: sends one approved manual newsletter (spec §6.6). Only the "bulten" GitHub
// environment holds the key, and a job gets it only after a reviewer approves the run.
import { authorized } from '@/lib/cron-auth'
import { sendNewsletter } from '@/lib/newsletter-send'

// Mailing every subscriber takes time (10 mails per second): the Hobby maximum.
export const maxDuration = 300

export async function POST(request: Request) {
  const secret = process.env.BULTEN_SECRET
  if (!secret || !authorized(request.headers.get('authorization'), secret)) return new Response('Unauthorized', { status: 401 })
  if (process.env.BULTEN_KAPALI?.trim() === '1') return Response.json({ error: 'disabled' }, { status: 503 })
  const input = (await request.json().catch(() => null)) as { slug?: unknown; hash?: unknown } | null
  const { status, body } = await sendNewsletter(typeof input?.slug === 'string' ? input.slug : '', typeof input?.hash === 'string' ? input.hash : '')
  return Response.json(body, { status })
}
