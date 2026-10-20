// lib/membership-sheet.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyToSheet, confirmInSheet, sheetReady, type SheetRow } from '@/lib/membership-sheet'

const fetchMock = vi.fn()
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
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
