// lib/membership-sheet.ts: the members sheet (spec 2026-10-19 §4), reached through its Apps Script web app
// (scripts/uyelik-apps-script.gs): one JSON POST per call with the shared secret, from the server only, so the browser
// never talks to Google. In development without the two variables the calls are logged and succeed, as SES's mails are.
import type { Locale } from '@/i18n/routing'

export type SheetRow = {
  token: string
  /** Istanbul time, "YYYY-MM-DD HH:mm" */
  at: string
  firstName: string
  lastName: string
  email: string
  birthDate: string
  guardian: boolean
  city: string
  wcaId: string
  helps: boolean
  locale: Locale
}
/** pending: a new or renewed application waits for its link; recent: its link went out less than a day ago;
 *  member: the address is already a member */
export type ApplyResult = 'pending' | 'recent' | 'member' | 'error'
export type ConfirmResult = 'ok' | 'invalid' | 'error'

const TIMEOUT_MS = 10_000

function config(): { url: string; secret: string } | null {
  const url = process.env.MEMBERSHIP_SCRIPT_URL
  const secret = process.env.MEMBERSHIP_SCRIPT_SECRET
  return url && secret ? { url, secret } : null
}

/** false: the form says it is closed (production without the variables). */
export function sheetReady(): boolean {
  return config() !== null || process.env.NODE_ENV === 'development'
}

/** The script's `result`, or 'error' (logged) for anything else. */
async function call(action: 'apply' | 'confirm', payload: object, devResult: string): Promise<string> {
  const c = config()
  if (!c) {
    if (process.env.NODE_ENV !== 'development') return 'error'
    console.log('[membership:dev] sheet', action, JSON.stringify(payload))
    return devResult
  }
  try {
    const res = await fetch(c.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: c.secret, action, ...payload }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`membership sheet ${action}: HTTP ${res.status}`)
      return 'error'
    }
    const data = (await res.json()) as { result?: unknown; reason?: unknown } | null
    if (typeof data?.result !== 'string') {
      console.error(`membership sheet ${action}: no result`)
      return 'error'
    }
    if (data.result === 'error') console.error(`membership sheet ${action}: ${String(data.reason)}`)
    return data.result
  } catch (e) {
    console.error(`membership sheet ${action} failed:`, e instanceof Error ? e.name : String(e))
    return 'error'
  }
}

export async function applyToSheet(row: SheetRow): Promise<ApplyResult> {
  const result = await call('apply', row, 'pending')
  return result === 'pending' || result === 'recent' || result === 'member' ? result : 'error'
}

export async function confirmInSheet(token: string, at: string): Promise<ConfirmResult> {
  const result = await call('confirm', { token, at }, 'ok')
  return result === 'ok' || result === 'invalid' ? result : 'error'
}
