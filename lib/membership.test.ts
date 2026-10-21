// lib/membership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmMembership, istanbulStamp, requestMembership } from '@/lib/membership'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { prepareSubscription, requestSubscription } from '@/lib/newsletter'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'

vi.mock('@/lib/membership-sheet', () => ({ applyToSheet: vi.fn(), confirmInSheet: vi.fn() }))
vi.mock('@/lib/newsletter', () => ({ prepareSubscription: vi.fn(), requestSubscription: vi.fn() }))
vi.mock('@/lib/ses', () => ({ sendMail: vi.fn() }))

const NOW = new Date(Date.UTC(2026, 9, 19, 11, 5)) // 14:05 in Istanbul
// What goes to the sheet; the newsletter box never does
const FIELDS = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', helps: false }
const APP: Application = { ...FIELDS, newsletter: false }

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
    expect(row).toMatchObject({ ...FIELDS, wcaId: '', at: '2026-10-19 14:05', locale: 'en' })
    expect(row).not.toHaveProperty('newsletter')
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

  it('with the newsletter box: the confirm link carries the newsletter token', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    vi.mocked(prepareSubscription).mockResolvedValue('NEWS')
    expect(await requestMembership({ ...APP, newsletter: true }, 'tr', NOW)).toBe(true)
    expect(prepareSubscription).toHaveBeenCalledWith('ayse@example.com', 'tr', NOW.getTime())
    expect(vi.mocked(applyToSheet).mock.calls[0][0]).not.toHaveProperty('newsletter')
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toMatch(/\/uye-ol\/onay\?t=[\w-]{43}&b=NEWS/)
  })

  it('with the newsletter box but no newsletter token (a subscriber, or SES failed): the plain link', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    vi.mocked(prepareSubscription).mockResolvedValue(null)
    expect(await requestMembership({ ...APP, newsletter: true }, 'tr', NOW)).toBe(true)
    expect(vi.mocked(sendMail).mock.calls[0][0].text).not.toContain('&b=')
  })

  it("with the newsletter box and no membership mail: the newsletter form's own path", async () => {
    for (const result of ['member', 'recent'] as const) {
      vi.mocked(applyToSheet).mockResolvedValue(result)
      expect(await requestMembership({ ...APP, newsletter: true }, 'en', NOW)).toBe(true)
    }
    expect(requestSubscription).toHaveBeenCalledTimes(2)
    expect(requestSubscription).toHaveBeenCalledWith('ayse@example.com', 'en', NOW.getTime())
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('without the box: no newsletter call and no token in the link', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    await requestMembership(APP, 'tr', NOW)
    vi.mocked(applyToSheet).mockResolvedValue('member')
    await requestMembership(APP, 'tr', NOW)
    expect(prepareSubscription).not.toHaveBeenCalled()
    expect(requestSubscription).not.toHaveBeenCalled()
    expect(vi.mocked(sendMail).mock.calls[0][0].text).not.toContain('&b=')
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
