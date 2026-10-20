// lib/membership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmMembership, istanbulStamp, requestMembership } from '@/lib/membership'
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

  it('tells a member they already are one, with no link', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('member')
    expect(await requestMembership(APP, 'tr', NOW)).toBe(true)
    const mail = vi.mocked(sendMail).mock.calls[0][0]
    expect(mail.subject).toBe('Zaten üyesin')
    expect(mail.text).not.toContain('/uye-ol/onay')
  })

  it('sends nothing for a link that went out less than a day ago, and still reports success', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('recent')
    expect(await requestMembership(APP, 'tr', NOW)).toBe(true)
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
