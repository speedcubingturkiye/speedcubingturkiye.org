// app/api/pow/route.ts: a proof-of-work challenge for the contact form (lib/pow.ts), fetched on the form's first focus
import { NextResponse } from 'next/server'
import { powChallenge } from '@/lib/pow'

export function GET() {
  return NextResponse.json(powChallenge(), { headers: { 'Cache-Control': 'no-store' } })
}
