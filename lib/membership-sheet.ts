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

type Action = 'apply' | 'confirm' | 'link' | 'get' | 'update' | 'changeEmail' | 'delete' | 'linkWca' | 'unlinkWca' | 'ranking' | 'rankingMembers'
type Answer = { result: string; [key: string]: unknown }

/** The script's whole answer, or `{ result: 'error' }` (logged) for anything without a string `result`. */
async function post(action: Action, payload: object, dev: Answer): Promise<Answer> {
  const c = config()
  if (!c) {
    if (process.env.NODE_ENV !== 'development') return { result: 'error' }
    console.log('[membership:dev] sheet', action, JSON.stringify(payload))
    return dev
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
      return { result: 'error' }
    }
    const data = (await res.json()) as { result?: unknown; reason?: unknown } | null
    if (typeof data?.result !== 'string') {
      console.error(`membership sheet ${action}: no result`)
      return { result: 'error' }
    }
    if (data.result === 'error') console.error(`membership sheet ${action}: ${String(data.reason)}`)
    return data as Answer
  } catch (e) {
    console.error(`membership sheet ${action} failed:`, e instanceof Error ? e.name : String(e))
    return { result: 'error' }
  }
}

/** The script's `result` when it is one of `allowed`, 'error' otherwise. */
async function call<R extends string>(action: Action, payload: object, allowed: readonly R[], dev: R): Promise<R | 'error'> {
  const { result } = await post(action, payload, { result: dev })
  return (allowed as readonly string[]).includes(result) ? (result as R) : 'error'
}

export async function applyToSheet(row: SheetRow): Promise<ApplyResult> {
  return call('apply', row, ['pending', 'recent', 'member'], 'pending')
}

export async function confirmInSheet(token: string, at: string): Promise<ConfirmResult> {
  return call('confirm', { token, at }, ['ok', 'invalid'], 'ok')
}

/** A member's details as Hesabım (spec 2026-10-21) shows and edits them */
export type MemberDetails = {
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
/** The details and the WCA side (Parça 2): `wcaVerified`, the WCA login confirmed the WCA ID; `ranking`, in the il
 *  ranking; `cityLockedUntil`, "YYYY-MM-DD" while the ranking's city lock runs, '' otherwise */
export type MemberRecord = MemberDetails & { wcaVerified: boolean; ranking: boolean; cityLockedUntil: string }
/** What Hesabım's form may change; the address has its own confirmed flow, the WCA ID comes only from a WCA login */
export type MemberFields = Omit<MemberDetails, 'email' | 'locale' | 'wcaId'>

function isMember(m: unknown): m is MemberDetails {
  if (typeof m !== 'object' || m === null) return false
  const r = m as Record<string, unknown>
  return (
    ['firstName', 'lastName', 'email', 'birthDate', 'city', 'wcaId'].every((k) => typeof r[k] === 'string') &&
    typeof r.guardian === 'boolean' &&
    typeof r.helps === 'boolean' &&
    (r.locale === 'tr' || r.locale === 'en')
  )
}

// Development without the script: a sample member for whatever address asks, so Hesabım can be seen locally
const devMember = (email: string): MemberDetails => ({
  firstName: 'Deneme',
  lastName: 'Üye',
  email,
  birthDate: '1990-01-01',
  guardian: false,
  city: 'Ankara',
  wcaId: '',
  helps: false,
  locale: 'tr',
})

/** Hesabım's link: 'ok' when the address is a member and had no link in the last 10 minutes, 'none' otherwise. */
export async function linkFromSheet(email: string): Promise<'ok' | 'none' | 'error'> {
  return call('link', { email }, ['ok', 'none'], 'ok')
}

/** The member's details; null when the address is not (or no longer) a member. A script older than Parça 2 sends no
 *  WCA fields: that reads as unverified and out of the ranking. */
export async function getMember(email: string): Promise<MemberRecord | null | 'error'> {
  const answer = await post('get', { email }, { result: 'ok', member: devMember(email) })
  if (answer.result === 'none') return null
  if (answer.result !== 'ok' || !isMember(answer.member)) return 'error'
  const m = answer.member as MemberDetails & Partial<Record<'wcaVerified' | 'ranking' | 'cityLockedUntil', unknown>>
  return { ...m, wcaVerified: m.wcaVerified === true, ranking: m.ranking === true, cityLockedUntil: typeof m.cityLockedUntil === 'string' ? m.cityLockedUntil : '' }
}

/** 'locked': the city may not change yet (the il ranking's lock). `at`: the Istanbul stamp the lock is measured at. */
export async function updateMember(email: string, fields: MemberFields, at: string): Promise<'ok' | 'none' | 'locked' | 'error'> {
  return call('update', { email, ...fields, at }, ['ok', 'none', 'locked'], 'ok')
}

/** 'taken' when another row already has the new address. */
export async function changeMemberEmail(email: string, newEmail: string): Promise<'ok' | 'none' | 'taken' | 'error'> {
  return call('changeEmail', { email, newEmail }, ['ok', 'none', 'taken'], 'ok')
}

export async function deleteMember(email: string): Promise<'ok' | 'none' | 'error'> {
  return call('delete', { email }, ['ok', 'none'], 'ok')
}

/** WCA bağlama (spec 2026-10-21, Parça 2): 'taken' when another member verified this WCA ID first. */
export async function linkMemberWca(email: string, wcaId: string, at: string): Promise<'ok' | 'none' | 'taken' | 'error'> {
  return call('linkWca', { email, wcaId, at }, ['ok', 'none', 'taken'], 'ok')
}

export async function unlinkMemberWca(email: string): Promise<'ok' | 'none' | 'error'> {
  return call('unlinkWca', { email }, ['ok', 'none'], 'ok')
}

/** İl sıralaması in or out; 'not_allowed' without a verified WCA ID, or with Yurt dışı. */
export async function setMemberRanking(email: string, join: boolean, at: string): Promise<'ok' | 'none' | 'not_allowed' | 'error'> {
  return call('ranking', { email, join, at }, ['ok', 'none', 'not_allowed'], 'ok')
}

export type RankingMember = { wcaId: string; il: string }
const isRankingMember = (m: unknown): m is RankingMember =>
  typeof m === 'object' && m !== null && typeof (m as RankingMember).wcaId === 'string' && typeof (m as RankingMember).il === 'string'

/** The il ranking's members: verified and opted in, with their province. */
export async function rankingMembers(): Promise<RankingMember[] | 'error'> {
  const { result, members } = await post('rankingMembers', {}, { result: 'ok', members: [] })
  return result === 'ok' && Array.isArray(members) && members.every(isRankingMember) ? members : 'error'
}
