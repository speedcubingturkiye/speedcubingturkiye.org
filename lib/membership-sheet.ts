// lib/membership-sheet.ts: the members sheet (spec 2026-10-19 §4), reached through its Apps Script web app
// (scripts/uyelik-apps-script.gs): one JSON POST per call with the shared secret, from the server only, so the browser
// never talks to Google. In development without the two variables the calls are logged and succeed, as SES's mails are.
import type { Locale } from '@/i18n/routing'
import { ABROAD } from '@/lib/wca/city'

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
  /** "+905054182759"; `chat`: the WhatsApp chat groups too (2026-10-24) */
  phone: string
  helps: boolean
  chat: boolean
  locale: Locale
  /** WCA ile kaydol (spec 2026-10-21): the WCA ID came from a WCA login; join the il ranking; the WCA login proved the
   *  address. A typed application leaves them out. */
  wcaVerified?: boolean
  ranking?: boolean
  confirmed?: boolean
}
/** pending: a new or renewed application waits for its link; recent: its link went out less than a day ago;
 *  member: the address is already a member. WCA ile kaydol adds started (a proved address became a member at once),
 *  linked (the WCA ID joined the member the address already is) and taken (another member verified this WCA ID). */
export type ApplyResult = 'pending' | 'recent' | 'member' | 'started' | 'linked' | 'taken' | 'error'
/** wca_taken: the membership began, without the WCA ID another member verified meanwhile (2026-10-22). */
export type ConfirmResult = 'ok' | 'wca_taken' | 'invalid' | 'error'

/** How long a call waits for the script: longer than the script may wait for its lock (20 s), with room for a cold
 *  start. Giving up sooner reported calls the script went on to finish as failures (a WCA sign-up, 2026-10-21). The
 *  pages and routes that call it allow 60 s (maxDuration). */
export const SHEET_TIMEOUT_MS = 30_000

function config(): { url: string; secret: string } | null {
  const url = process.env.MEMBERSHIP_SCRIPT_URL
  const secret = process.env.MEMBERSHIP_SCRIPT_SECRET
  return url && secret ? { url, secret } : null
}

/** false: the form says it is closed (production without the variables). */
export function sheetReady(): boolean {
  return config() !== null || process.env.NODE_ENV === 'development'
}

type Action =
  | 'apply'
  | 'confirm'
  | 'link'
  | 'get'
  | 'update'
  | 'changeEmail'
  | 'emailGate'
  | 'delete'
  | 'linkWca'
  | 'unlinkWca'
  | 'byWca'
  | 'ranking'
  | 'rankingMembers'
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
      signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
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
  // Development without the script: a WCA sign-up with a proved address starts at once, as the script would answer
  return call('apply', row, ['pending', 'recent', 'member', 'started', 'linked', 'taken'], row.confirmed ? 'started' : 'pending')
}

export async function confirmInSheet(token: string, at: string): Promise<ConfirmResult> {
  const answer = await post('confirm', { token, at }, { result: 'ok' })
  if (answer.result === 'ok') return answer.wca === 'taken' ? 'wca_taken' : 'ok'
  return answer.result === 'invalid' ? 'invalid' : 'error'
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
  /** "+905054182759", '' until the member gives one (a row from before 2026-10-24); `chat`: the WhatsApp chat groups */
  phone: string
  helps: boolean
  chat: boolean
  locale: Locale
}
/** The details and the WCA side (Parça 2): `wcaVerified`, the WCA login confirmed the WCA ID; `ranking`, in the il
 *  ranking; `cityLockedUntil`, "YYYY-MM-DD" while the ranking's city lock runs, '' otherwise; `memberNo`, the Üye no
 *  (2026-10-22, "YYYY-NNNN"; '' from a script older than it) */
export type MemberRecord = MemberDetails & { wcaVerified: boolean; ranking: boolean; cityLockedUntil: string; memberNo: string }
/** What Hesabım's form may change; the address has its own confirmed flow, the WCA ID comes only from a WCA login */
export type MemberFields = Omit<MemberDetails, 'email' | 'locale' | 'wcaId'>

// A script older than 2026-10-24 sends no phone and no chat groups: getMember reads them as '' and false
function isMember(m: unknown): m is Omit<MemberDetails, 'phone' | 'chat'> {
  if (typeof m !== 'object' || m === null) return false
  const r = m as Record<string, unknown>
  return (
    ['firstName', 'lastName', 'email', 'birthDate', 'city', 'wcaId'].every((k) => typeof r[k] === 'string') &&
    typeof r.guardian === 'boolean' &&
    typeof r.helps === 'boolean' &&
    (r.locale === 'tr' || r.locale === 'en')
  )
}

// Development without the script: a sample member for whatever address asks, so Hesabım can be seen locally. The
// address's name picks what to look at (2026-10-22): "wca" linked, "sira" in the il ranking with the city locked,
// "yurtdisi" in it from abroad, "cocuk" under 18, "sohbet" in the WhatsApp chat groups; any other address is a plain
// member.
const devMember = (email: string): MemberRecord => {
  const has = (word: string) => email.split('@')[0].includes(word)
  const ranked = has('sira') || has('yurtdisi')
  const linked = ranked || has('wca')
  return {
    firstName: 'Deneme',
    lastName: 'Üye',
    email,
    birthDate: has('cocuk') ? '2012-05-04' : '1990-01-01',
    guardian: has('cocuk'),
    city: has('yurtdisi') ? ABROAD : 'Ankara',
    wcaId: linked ? '2019TEME01' : '',
    phone: '+905054182759',
    helps: false,
    chat: has('sohbet'),
    locale: 'tr',
    wcaVerified: linked,
    ranking: ranked,
    cityLockedUntil: ranked ? '2027-10-22' : '',
    memberNo: '2026-0001',
  }
}

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
  const m = answer.member as typeof answer.member & Partial<Record<'wcaVerified' | 'ranking' | 'cityLockedUntil' | 'memberNo' | 'phone' | 'chat', unknown>>
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    ...m,
    phone: text(m.phone),
    chat: m.chat === true,
    wcaVerified: m.wcaVerified === true,
    ranking: m.ranking === true,
    cityLockedUntil: text(m.cityLockedUntil),
    memberNo: text(m.memberNo),
  }
}

/** 'locked': the city may not change yet (the il ranking's lock). `at`: the Istanbul stamp the lock is measured at. */
export async function updateMember(email: string, fields: MemberFields, at: string): Promise<'ok' | 'none' | 'locked' | 'error'> {
  return call('update', { email, ...fields, at }, ['ok', 'none', 'locked'], 'ok')
}

/** 'taken' when another row already has the new address. */
export async function changeMemberEmail(email: string, newEmail: string): Promise<'ok' | 'none' | 'taken' | 'error'> {
  return call('changeEmail', { email, newEmail }, ['ok', 'none', 'taken'], 'ok')
}

/** Whether E-posta değiştirme may mail `newEmail` (2026-10-22): 'wait' when that mailbox had one in the last 10 minutes,
 *  so a member cannot flood someone else's inbox; 'none' when `email` is no member. */
export async function emailChangeGate(email: string, newEmail: string): Promise<'ok' | 'wait' | 'none' | 'error'> {
  return call('emailGate', { email, newEmail }, ['ok', 'wait', 'none'], 'ok')
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

/** WCA ile giriş (2026-10-22): the member whose verified WCA ID this is, or null. In development without the script, no
 *  one: the login then says the WCA account is not linked. */
export async function memberByWca(wcaId: string): Promise<{ email: string; locale: Locale } | null | 'error'> {
  const answer = await post('byWca', { wcaId }, { result: 'none' })
  if (answer.result === 'none') return null
  if (answer.result !== 'ok' || typeof answer.email !== 'string') return 'error'
  return { email: answer.email, locale: answer.locale === 'en' ? 'en' : 'tr' }
}

/** İl sıralaması in or out; 'not_allowed' without a verified WCA ID. */
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
