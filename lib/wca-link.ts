// lib/wca-link.ts: WCA bağlama (spec 2026-10-21, Parça 2). Hesabım sends the member through the WCA login (OAuth, scope
// `public`) and keeps only the WCA ID it returns. The WCA has no PKCE (its Doorkeeper grants table has no
// code_challenge), so a random state in a 10-minute cookie ties the return to the browser that left.
import { randomBytes } from 'node:crypto'
import { istanbulStamp } from '@/lib/membership'
import { WCA_ID_RE } from '@/lib/membership-rules'
import { linkMemberWca } from '@/lib/membership-sheet'
import { makeToken, readToken, type TokenData } from '@/lib/newsletter-token'
import { WCA_BASE, WCA_UA } from '@/lib/wca/client'
import { site } from '@/site.config'

export const FLOW_COOKIE = 'wca_baglan'
export const FLOW_PATH = '/api/wca'
export const FLOW_MAX_AGE = 600
/** The address registered with the WCA application */
export const REDIRECT_URI = `${site.url}/api/wca/donus`
const TIMEOUT_MS = 10_000

function client(): { id: string; secret: string } | null {
  const id = process.env.WCA_CLIENT_ID
  const secret = process.env.WCA_CLIENT_SECRET
  return id && secret ? { id, secret } : null
}

/** Whether Hesabım offers the link. Development shows it without the keys; the button then comes back with an error. */
export const wcaReady = () => client() !== null || process.env.NODE_ENV === 'development'

/** Hesabım again, with a fresh one-hour token and the outcome for its notice */
export const backToAccount = (data: TokenData, durum: string, now = Date.now()) =>
  `${data.locale === 'en' ? '/en' : ''}/hesabim?t=${makeToken('hesap', data, now)}${durum ? `&durum=${durum}` : ''}`

/** The way out: the WCA login address, and the cookie that waits for the return with a token minted now, so the round
 *  trip never outlives the page's hour. null without the keys. */
export function startWcaLink(data: TokenData, now = Date.now()): { url: string; cookie: string } | null {
  const c = client()
  if (!c) return null
  const state = randomBytes(32).toString('base64url')
  const query = new URLSearchParams({ client_id: c.id, redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'public', state })
  return { url: `${WCA_BASE}/oauth/authorize?${query}`, cookie: `${state}.${makeToken('hesap', data, now)}` }
}

/** The WCA ID of the account that logged in: null when it has none (never competed), 'error' when the WCA failed. */
export async function wcaIdFromCode(code: string): Promise<string | null | 'error'> {
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
    const wcaId = ((await me.json()) as { me?: { wca_id?: unknown } }).me?.wca_id
    if (wcaId === null || wcaId === undefined) return null
    if (typeof wcaId !== 'string' || !WCA_ID_RE.test(wcaId)) throw new Error('me: unreadable wca_id')
    return wcaId
  } catch (e) {
    // Our own messages and fetch's error text only: never the code, the secret or the access token
    console.error('WCA link failed:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}

/** The return from the WCA: where to send the member. A missing cookie, another state or a page link that ran out
 *  sends them to the link form; the membership is touched only after all three check out. */
export async function finishWcaLink(cookie: string | undefined, params: URLSearchParams, now = Date.now()): Promise<string> {
  const [state, token] = (cookie ?? '').split('.')
  const data = state && state === params.get('state') ? readToken('hesap', token ?? '', now) : null
  if (!data) return '/hesabim?durum=gecersiz'
  const code = params.get('code')
  if (!code) return backToAccount(data, '', now) // the member said no on the WCA's page
  const wcaId = await wcaIdFromCode(code)
  if (wcaId === 'error') return backToAccount(data, 'wca-hata', now)
  if (wcaId === null) return backToAccount(data, 'wca-yok', now)
  const result = await linkMemberWca(data.email, wcaId, istanbulStamp(new Date(now)))
  if (result === 'none') return `${data.locale === 'en' ? '/en' : ''}/hesabim?durum=gecersiz` // left meanwhile
  return backToAccount(data, { ok: 'wca-baglandi', taken: 'wca-kullanimda', error: 'wca-hata' }[result], now)
}
