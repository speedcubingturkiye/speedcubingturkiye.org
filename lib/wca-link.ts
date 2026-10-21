// lib/wca-link.ts: the WCA login (spec 2026-10-21), for two flows:
// - WCA bağlama (Parça 2): Hesabım sends the member through it (scope `public`) and keeps only the WCA ID it returns.
// - WCA ile kaydol: Üye ol asks for the profile, the email and the date of birth (`public email dob`) to fill the form.
// The WCA has no PKCE (its Doorkeeper grants table has no code_challenge), so a random state in a 10-minute cookie ties
// the return to the browser that left. The cookie also names the flow: `<state>.h.<Hesabım token>` or `<state>.k.<locale>`.
import { randomBytes } from 'node:crypto'
import type { Locale } from '@/i18n/routing'
import { istanbulStamp } from '@/lib/membership'
import { WCA_ID_RE } from '@/lib/membership-rules'
import { linkMemberWca } from '@/lib/membership-sheet'
import { makeToken, readToken, type TokenData } from '@/lib/newsletter-token'
import { WCA_BASE, WCA_UA } from '@/lib/wca/client'
import { site } from '@/site.config'

export const FLOW_COOKIE = 'wca_baglan'
export const FLOW_PATH = '/api/wca'
export const FLOW_MAX_AGE = 600
/** The state cookie's settings, the same for both flows */
export const FLOW_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: FLOW_PATH, maxAge: FLOW_MAX_AGE }
/** The address registered with the WCA application */
export const REDIRECT_URI = `${site.url}/api/wca/donus`
const SIGNUP_SCOPE = 'public email dob'
const TIMEOUT_MS = 10_000

function client(): { id: string; secret: string } | null {
  const id = process.env.WCA_CLIENT_ID
  const secret = process.env.WCA_CLIENT_SECRET
  return id && secret ? { id, secret } : null
}

/** Whether the site offers the WCA login. Development shows it without the keys; the button then comes back with an error. */
export const wcaReady = () => client() !== null || process.env.NODE_ENV === 'development'

const prefix = (locale: Locale) => (locale === 'en' ? '/en' : '')

/** Hesabım again, with a fresh one-hour token and the outcome for its notice */
export const backToAccount = (data: TokenData, durum: string, now = Date.now()) =>
  `${prefix(data.locale)}/hesabim?t=${makeToken('hesap', data, now)}${durum ? `&durum=${durum}` : ''}`

/** The WCA login address for `scope`, with a fresh state for the cookie. */
function authorize(id: string, scope: string): { url: string; state: string } {
  const state = randomBytes(32).toString('base64url')
  const query = new URLSearchParams({ client_id: id, redirect_uri: REDIRECT_URI, response_type: 'code', scope, state })
  return { url: `${WCA_BASE}/oauth/authorize?${query}`, state }
}

/** WCA bağlama, the way out: the WCA login address, and the cookie that waits for the return with a token minted now,
 *  so the round trip never outlives the page's hour. null without the keys. */
export function startWcaLink(data: TokenData, now = Date.now()): { url: string; cookie: string } | null {
  const c = client()
  if (!c) return null
  const { url, state } = authorize(c.id, 'public')
  return { url, cookie: `${state}.h.${makeToken('hesap', data, now)}` }
}

/** WCA ile kaydol, the way out: the WCA login asking for the profile, the email and the date of birth. null without the keys. */
export function startWcaSignup(locale: Locale): { url: string; cookie: string } | null {
  const c = client()
  if (!c) return null
  const { url, state } = authorize(c.id, SIGNUP_SCOPE)
  return { url, cookie: `${state}.k.${locale}` }
}

/** What the WCA gives for the account that logged in. `wcaId` is null for an account that never competed; `email` (the
 *  address the WCA verified) and `dob` are '' unless the sign-up scopes were granted. */
export type WcaProfile = { wcaId: string | null; name: string; email: string; dob: string }

/** The profile of the account that logged in; 'error' when the WCA failed. */
export async function wcaProfile(code: string): Promise<WcaProfile | 'error'> {
  const c = client()
  if (!c) return 'error'
  const headers = { 'User-Agent': WCA_UA, Accept: 'application/json' }
  try {
    const res = await fetch(`${WCA_BASE}/oauth/token`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: c.id, client_secret: c.secret }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`token HTTP ${res.status}`)
    const { access_token: accessToken } = (await res.json()) as { access_token?: unknown }
    if (typeof accessToken !== 'string') throw new Error('token: none in the answer')
    const me = await fetch(`${WCA_BASE}/api/v0/me`, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!me.ok) throw new Error(`me HTTP ${me.status}`)
    const v = ((await me.json()) as { me?: Record<string, unknown> }).me ?? {}
    const id = v.wca_id
    if (id !== null && id !== undefined && (typeof id !== 'string' || !WCA_ID_RE.test(id))) throw new Error('me: unreadable wca_id')
    const str = (x: unknown) => (typeof x === 'string' ? x : '')
    const dob = str(v.dob)
    return { wcaId: typeof id === 'string' ? id : null, name: str(v.name), email: str(v.email), dob: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : '' }
  } catch (e) {
    // Our own messages and fetch's error text only: never the code, the secret or the access token
    console.error('WCA login failed:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}

/** The return from the WCA: where to send the visitor. A missing cookie, another state or (for Hesabım) a page link that
 *  ran out sends them back without touching anything; the membership is touched only after all of them check out. */
export async function finishWcaLink(cookie: string | undefined, params: URLSearchParams, now = Date.now()): Promise<string> {
  const [state, kind, payload] = (cookie ?? '').split('.')
  const stateOk = Boolean(state) && state === params.get('state')
  if (kind === 'k') {
    const locale: Locale = payload === 'en' ? 'en' : 'tr'
    return stateOk ? finishWcaSignup(locale, params, now) : `${prefix(locale)}/uye-ol?durum=gecersiz`
  }
  const data = stateOk && kind === 'h' ? readToken('hesap', payload ?? '', now) : null
  if (!data) return '/hesabim?durum=gecersiz'
  const code = params.get('code')
  if (!code) return backToAccount(data, '', now) // the member said no on the WCA's page
  const profile = await wcaProfile(code)
  if (profile === 'error') return backToAccount(data, 'wca-hata', now)
  if (profile.wcaId === null) return backToAccount(data, 'wca-yok', now)
  const result = await linkMemberWca(data.email, profile.wcaId, istanbulStamp(new Date(now)))
  if (result === 'none') return `${prefix(data.locale)}/hesabim?durum=gecersiz` // left meanwhile
  return backToAccount(data, { ok: 'wca-baglandi', taken: 'wca-kullanimda', error: 'wca-hata' }[result], now)
}

/** WCA ile kaydol's return: Üye ol again, with what the WCA gave in a 30-minute token. */
async function finishWcaSignup(locale: Locale, params: URLSearchParams, now: number): Promise<string> {
  const page = `${prefix(locale)}/uye-ol`
  const code = params.get('code')
  if (!code) return page // the visitor said no on the WCA's page
  const profile = await wcaProfile(code)
  if (profile === 'error') return `${page}?durum=wca-hata`
  const { wcaId, name, email, dob } = profile
  return `${page}?w=${makeToken('kaydol', { email, locale, ...(wcaId ? { wcaId } : {}), name, dob }, now)}`
}

/** WCA keeps one name field: the last word is taken as the surname, a local-script name in parentheses is dropped. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const words = name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean)
  return words.length < 2 ? { firstName: words[0] ?? '', lastName: '' } : { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] }
}
