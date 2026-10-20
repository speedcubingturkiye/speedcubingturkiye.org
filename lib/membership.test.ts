// lib/membership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmMembership, istanbulStamp, requestMembership, wcaIdExists } from '@/lib/membership'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'

vi.mock('@/lib/membership-sheet', () => ({ applyToSheet: vi.fn(), confirmInSheet: vi.fn() }))
vi.mock('@/lib/ses', () => ({ sendMail: vi.fn() }))

const NOW = new Date(Date.UTC(2026, 9, 19, 11, 5)) // 14:05 in Istanbul
const APP: Application = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', wcaId: '', helps: false }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(sendMail).mockResolvedValue(true)
})

describe('istanbulStamp', () => {
  it('writes Istanbul time as the sheet keeps it', () => {
    expect(istanbulStamp(NOW)).toBe('2026-10-19 14:05')
  })
})

describe('requestMembership', () => {
  it('writes a pending row with a fresh token and mails its link in the page language', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    expect(await requestMembership(APP, 'en', NOW)).toBe(true)
    const row = vi.mocked(applyToSheet).mock.calls[0][0]
    expect(row).toMatchObject({ ...APP, at: '2026-10-19 14:05', locale: 'en' })
    expect(row.token).toMatch(/^[\w-]{43}$/)
    const mail = vi.mocked(sendMail).mock.calls[0][0]
    expect(mail.to).toBe('ayse@example.com')
    expect(mail.subject).toBe('Confirm your membership')
    expect(mail.text).toContain(`${site.url}/en/uye-ol/onay?t=${row.token}`)
  })

  it('sends nothing to a member or for a link that went out less than a day ago, and still reports success', async () => {
    for (const result of ['member', 'recent'] as const) {
      vi.mocked(applyToSheet).mockResolvedValue(result)
      expect(await requestMembership(APP, 'tr', NOW), result).toBe(true)
    }
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('fails when the sheet or the mail fails', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('error')
    expect(await requestMembership(APP, 'tr', NOW)).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    vi.mocked(sendMail).mockResolvedValue(false)
    expect(await requestMembership(APP, 'tr', NOW)).toBe(false)
  })
})

describe('wcaIdExists', () => {
  it('is false only when the WCA answers that the ID does not exist', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    expect(await wcaIdExists('2019TEME01')).toBe(true)
    expect(fetch.mock.calls[0][0]).toBe('https://www.worldcubeassociation.org/api/v0/persons/2019TEME01')
    fetch.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    expect(await wcaIdExists('2019TEMA01')).toBe(false)
    // an outage or a timeout lets the application through
    fetch.mockResolvedValueOnce(new Response('', { status: 503 }))
    expect(await wcaIdExists('2019TEME01')).toBe(true)
    fetch.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
    expect(await wcaIdExists('2019TEME01')).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('confirmMembership', () => {
  it('confirms a well-formed token through the sheet', async () => {
    vi.mocked(confirmInSheet).mockResolvedValue('ok')
    expect(await confirmMembership('k'.repeat(43), NOW)).toBe(true)
    expect(confirmInSheet).toHaveBeenCalledWith('k'.repeat(43), '2026-10-19 14:05')
    vi.mocked(confirmInSheet).mockResolvedValue('invalid')
    expect(await confirmMembership('k'.repeat(43), NOW)).toBe(false)
  })

  it('rejects a malformed token without calling the sheet', async () => {
    expect(await confirmMembership('short', NOW)).toBe(false)
    expect(await confirmMembership('', NOW)).toBe(false)
    expect(confirmInSheet).not.toHaveBeenCalled()
  })
})
