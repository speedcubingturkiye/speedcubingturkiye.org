// lib/wca-link.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { linkMemberWca } from '@/lib/membership-sheet'
import { readToken } from '@/lib/newsletter-token'
import { finishWcaLink, REDIRECT_URI, startWcaLink } from '@/lib/wca-link'

vi.mock('@/lib/membership-sheet', () => ({ linkMemberWca: vi.fn() }))

const fetchMock = vi.fn()
const NOW = Date.UTC(2026, 9, 21, 12)
const DATA = { email: 'ayse@example.com', locale: 'en' as const }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const wcaAnswers = (me: unknown) => fetchMock.mockResolvedValueOnce(json({ access_token: 'tok' })).mockResolvedValueOnce(json({ me }))

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEWSLETTER_SECRET', 'a'.repeat(32))
  vi.stubEnv('WCA_CLIENT_ID', 'id')
  vi.stubEnv('WCA_CLIENT_SECRET', 'secret')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  fetchMock.mockReset()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/** A flow started at NOW, and the WCA's return to it with `q` */
function started() {
  const flow = startWcaLink(DATA, NOW)!
  const state = new URL(flow.url).searchParams.get('state')!
  return { flow, state, back: (q: Record<string, string>) => new URLSearchParams({ state, ...q }) }
}
const outcome = (path: string) => {
  const u = new URL(path, 'https://example.test')
  return { path: u.pathname, durum: u.searchParams.get('durum'), data: readToken('hesap', u.searchParams.get('t') ?? '', NOW) }
}

describe('startWcaLink', () => {
  it('sends the member to the WCA login with scope public and a state the cookie keeps beside a fresh token', () => {
    const { flow, state } = started()
    const url = new URL(flow.url)
    expect(`${url.origin}${url.pathname}`).toBe('https://www.worldcubeassociation.org/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: 'id', redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'public', state })
    expect(state).toMatch(/^[\w-]{43}$/)
    expect(flow.cookie.startsWith(`${state}.`)).toBe(true)
    expect(readToken('hesap', flow.cookie.slice(state.length + 1), NOW)).toEqual(DATA)
  })

  it('is null without the keys', () => {
    vi.stubEnv('WCA_CLIENT_SECRET', '')
    expect(startWcaLink(DATA, NOW)).toBeNull()
  })
})

describe('finishWcaLink', () => {
  it('links the WCA ID the login returns and opens Hesabım again with a fresh token', async () => {
    const { flow, back } = started()
    wcaAnswers({ id: 1, wca_id: '2019TEME01', name: 'Ayşe' })
    vi.mocked(linkMemberWca).mockResolvedValue('ok')
    expect(outcome(await finishWcaLink(flow.cookie, back({ code: 'c0de' }), NOW))).toEqual({ path: '/en/hesabim', durum: 'wca-baglandi', data: DATA })
    expect(linkMemberWca).toHaveBeenCalledWith('ayse@example.com', '2019TEME01', '2026-10-21 15:00')
    const [tokenUrl, init] = fetchMock.mock.calls[0]
    expect(tokenUrl).toBe('https://www.worldcubeassociation.org/oauth/token')
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      grant_type: 'authorization_code',
      code: 'c0de',
      redirect_uri: REDIRECT_URI,
      client_id: 'id',
      client_secret: 'secret',
    })
    expect(fetchMock.mock.calls[1][0]).toBe('https://www.worldcubeassociation.org/api/v0/me')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok')
  })

  it('tells an account without a WCA ID, an ID another member verified, and a WCA that did not answer', async () => {
    const { flow, back } = started()
    wcaAnswers({ id: 1, wca_id: null })
    expect(outcome(await finishWcaLink(flow.cookie, back({ code: 'c' }), NOW)).durum).toBe('wca-yok')
    wcaAnswers({ wca_id: '2019TEME01' })
    vi.mocked(linkMemberWca).mockResolvedValue('taken')
    expect(outcome(await finishWcaLink(flow.cookie, back({ code: 'c' }), NOW)).durum).toBe('wca-kullanimda')
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400))
    expect(outcome(await finishWcaLink(flow.cookie, back({ code: 'c' }), NOW)).durum).toBe('wca-hata')
  })

  it('refuses a return without its cookie, with another state, or after the page link ran out', async () => {
    const { flow, back } = started()
    expect(await finishWcaLink(undefined, back({ code: 'c' }), NOW)).toBe('/hesabim?durum=gecersiz')
    expect(await finishWcaLink(flow.cookie, new URLSearchParams({ state: 'other', code: 'c' }), NOW)).toBe('/hesabim?durum=gecersiz')
    expect(await finishWcaLink(flow.cookie, back({ code: 'c' }), NOW + 3_600_001)).toBe('/hesabim?durum=gecersiz')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('goes back without a word when the member said no on the WCA page, and to the link form when the membership is gone', async () => {
    const { flow, back } = started()
    expect(outcome(await finishWcaLink(flow.cookie, back({ error: 'access_denied' }), NOW))).toEqual({ path: '/en/hesabim', durum: null, data: DATA })
    wcaAnswers({ wca_id: '2019TEME01' })
    vi.mocked(linkMemberWca).mockResolvedValue('none')
    expect(await finishWcaLink(flow.cookie, back({ code: 'c' }), NOW)).toBe('/en/hesabim?durum=gecersiz')
  })
})
