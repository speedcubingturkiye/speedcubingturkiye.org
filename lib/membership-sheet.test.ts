// lib/membership-sheet.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyToSheet,
  changeMemberEmail,
  confirmInSheet,
  deleteMember,
  getMember,
  linkFromSheet,
  linkMemberWca,
  rankingMembers,
  setMemberRanking,
  sheetReady,
  unlinkMemberWca,
  updateMember,
  type MemberDetails,
  type MemberFields,
  type SheetRow,
} from '@/lib/membership-sheet'

const fetchMock = vi.fn()
const FIELDS: MemberFields = { firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', helps: true }
const ROW: SheetRow = {
  token: 't'.repeat(43), at: '2026-10-19 14:05', firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com',
  birthDate: '1990-05-04', guardian: false, city: 'İstanbul', wcaId: '', helps: true, locale: 'tr',
}
const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('MEMBERSHIP_SCRIPT_URL', 'https://script.example/exec')
  vi.stubEnv('MEMBERSHIP_SCRIPT_SECRET', 's3cret')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('applyToSheet', () => {
  it('posts the row with the secret and the action, and returns the script result', async () => {
    answer({ result: 'pending' })
    expect(await applyToSheet(ROW)).toBe('pending')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://script.example/exec')
    expect(init.method).toBe('POST')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(init.body)).toEqual({ secret: 's3cret', action: 'apply', ...ROW })
  })

  it('passes recent and member through', async () => {
    answer({ result: 'recent' })
    expect(await applyToSheet(ROW)).toBe('recent')
    answer({ result: 'member' })
    expect(await applyToSheet(ROW)).toBe('member')
  })

  it('passes the WCA sign-up results through (WCA ile kaydol)', async () => {
    for (const result of ['started', 'linked', 'taken'] as const) {
      answer({ result })
      expect(await applyToSheet({ ...ROW, wcaId: '2019TEME01', wcaVerified: true, ranking: true, confirmed: true })).toBe(result)
    }
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ wcaVerified: true, ranking: true, confirmed: true })
  })

  it('turns an HTTP error, bad JSON, a thrown fetch or an unknown result into error', async () => {
    answer({ result: 'pending' }, 500)
    expect(await applyToSheet(ROW)).toBe('error')
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }))
    expect(await applyToSheet(ROW)).toBe('error')
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
    expect(await applyToSheet(ROW)).toBe('error')
    answer({ result: 'error', reason: 'auth' })
    expect(await applyToSheet(ROW)).toBe('error')
    answer({ result: 'surprise' })
    expect(await applyToSheet(ROW)).toBe('error')
  })
})

describe('confirmInSheet', () => {
  it('posts the token and the time, and maps the result', async () => {
    answer({ result: 'ok' })
    expect(await confirmInSheet('k'.repeat(43), '2026-10-20 09:00')).toBe('ok')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ secret: 's3cret', action: 'confirm', token: 'k'.repeat(43), at: '2026-10-20 09:00' })
    answer({ result: 'invalid' })
    expect(await confirmInSheet('k'.repeat(43), '2026-10-20 09:00')).toBe('invalid')
  })
})

describe('Hesabım calls', () => {
  const MEMBER: MemberDetails = { ...FIELDS, wcaId: '2019TEME01', email: 'ayse@example.com', locale: 'en' }
  const UNVERIFIED = { wcaVerified: false, ranking: false, cityLockedUntil: '' }
  const sent = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body)

  it('link and delete post the address and map the result', async () => {
    answer({ result: 'ok' })
    expect(await linkFromSheet('ayse@example.com')).toBe('ok')
    expect(sent()).toEqual({ secret: 's3cret', action: 'link', email: 'ayse@example.com' })
    answer({ result: 'none' })
    expect(await linkFromSheet('ayse@example.com')).toBe('none')
    answer({ result: 'ok' })
    expect(await deleteMember('ayse@example.com')).toBe('ok')
    expect(sent(2)).toEqual({ secret: 's3cret', action: 'delete', email: 'ayse@example.com' })
    answer({ result: 'pending' })
    expect(await deleteMember('ayse@example.com')).toBe('error')
  })

  it('getMember reads the member, null for none, error for a malformed one', async () => {
    answer({ result: 'ok', member: MEMBER })
    expect(await getMember('ayse@example.com')).toEqual({ ...MEMBER, ...UNVERIFIED })
    expect(sent()).toEqual({ secret: 's3cret', action: 'get', email: 'ayse@example.com' })
    answer({ result: 'none' })
    expect(await getMember('ayse@example.com')).toBeNull()
    answer({ result: 'ok', member: { ...MEMBER, guardian: 'Evet' } })
    expect(await getMember('ayse@example.com')).toBe('error')
    answer({ result: 'ok' })
    expect(await getMember('ayse@example.com')).toBe('error')
  })

  it('updateMember and changeMemberEmail post their fields and map the result', async () => {
    answer({ result: 'ok' })
    expect(await updateMember('ayse@example.com', FIELDS, '2026-10-21 15:00')).toBe('ok')
    expect(sent()).toEqual({ secret: 's3cret', action: 'update', email: 'ayse@example.com', ...FIELDS, at: '2026-10-21 15:00' })
    answer({ result: 'taken' })
    expect(await changeMemberEmail('ayse@example.com', 'yeni@example.com')).toBe('taken')
    expect(sent(1)).toEqual({ secret: 's3cret', action: 'changeEmail', email: 'ayse@example.com', newEmail: 'yeni@example.com' })
    answer({ result: 'none' })
    expect(await changeMemberEmail('ayse@example.com', 'yeni@example.com')).toBe('none')
  })

  it('getMember fills in the WCA fields; an older script without them reads as unverified', async () => {
    const wca = { wcaVerified: true, ranking: true, cityLockedUntil: '2027-10-21' }
    answer({ result: 'ok', member: { ...MEMBER, ...wca } })
    expect(await getMember('ayse@example.com')).toEqual({ ...MEMBER, ...wca })
    answer({ result: 'ok', member: { ...MEMBER, wcaVerified: 'Evet', cityLockedUntil: 7 } })
    expect(await getMember('ayse@example.com')).toEqual({ ...MEMBER, ...UNVERIFIED })
  })

  it('the WCA and ranking calls post their fields and map the result', async () => {
    answer({ result: 'locked' })
    expect(await updateMember('ayse@example.com', FIELDS, '2026-10-21 15:00')).toBe('locked')
    answer({ result: 'taken' })
    expect(await linkMemberWca('ayse@example.com', '2019TEME01', '2026-10-21 15:00')).toBe('taken')
    expect(sent(1)).toEqual({ secret: 's3cret', action: 'linkWca', email: 'ayse@example.com', wcaId: '2019TEME01', at: '2026-10-21 15:00' })
    answer({ result: 'ok' })
    expect(await unlinkMemberWca('ayse@example.com')).toBe('ok')
    expect(sent(2)).toEqual({ secret: 's3cret', action: 'unlinkWca', email: 'ayse@example.com' })
    answer({ result: 'not_allowed' })
    expect(await setMemberRanking('ayse@example.com', true, '2026-10-21 15:00')).toBe('not_allowed')
    expect(sent(3)).toEqual({ secret: 's3cret', action: 'ranking', email: 'ayse@example.com', join: true, at: '2026-10-21 15:00' })
    answer({ result: 'taken' })
    expect(await setMemberRanking('ayse@example.com', false, '2026-10-21 15:00')).toBe('error')
  })

  it('rankingMembers returns the list, and error for a malformed one or the script before this update', async () => {
    answer({ result: 'ok', members: [{ wcaId: '2019TEME01', il: 'Ankara' }] })
    expect(await rankingMembers()).toEqual([{ wcaId: '2019TEME01', il: 'Ankara' }])
    expect(sent()).toEqual({ secret: 's3cret', action: 'rankingMembers' })
    answer({ result: 'ok', members: [{ wcaId: 1, il: 'Ankara' }] })
    expect(await rankingMembers()).toBe('error')
    answer({ result: 'error', reason: 'action' })
    expect(await rankingMembers()).toBe('error')
  })
})

describe('without the variables', () => {
  it('is closed in production and calls nothing', async () => {
    vi.stubEnv('MEMBERSHIP_SCRIPT_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(sheetReady()).toBe(false)
    expect(await applyToSheet(ROW)).toBe('error')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs and succeeds in development, like the SES mails', async () => {
    vi.stubEnv('MEMBERSHIP_SCRIPT_SECRET', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(sheetReady()).toBe(true)
    expect(await applyToSheet(ROW)).toBe('pending')
    expect(await confirmInSheet('k'.repeat(43), '2026-10-20 09:00')).toBe('ok')
    // Hesabım shows a sample member, so the page can be seen without the script
    expect(await linkFromSheet('a@b.com')).toBe('ok')
    expect(await getMember('a@b.com')).toMatchObject({ email: 'a@b.com' })
    expect(await updateMember('a@b.com', FIELDS, '2026-10-21 15:00')).toBe('ok')
    expect(await changeMemberEmail('a@b.com', 'c@d.com')).toBe('ok')
    expect(await deleteMember('a@b.com')).toBe('ok')
    expect(await rankingMembers()).toEqual([]) // the il ranking shows no one
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
