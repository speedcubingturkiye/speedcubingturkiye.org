// lib/membership.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmCode, confirmMembership, istanbulStamp, requestMembership, requestWcaMembership } from '@/lib/membership'
import type { Application } from '@/lib/membership-rules'
import { applyToSheet, confirmInSheet } from '@/lib/membership-sheet'
import { prepareSubscription, requestSubscription, subscribeVerified } from '@/lib/newsletter'
import { signCode } from '@/lib/newsletter-token'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'

vi.mock('@/lib/membership-sheet', () => ({ applyToSheet: vi.fn(), confirmInSheet: vi.fn() }))
vi.mock('@/lib/newsletter', () => ({ prepareSubscription: vi.fn(), requestSubscription: vi.fn(), subscribeVerified: vi.fn() }))
vi.mock('@/lib/ses', () => ({ sendMail: vi.fn() }))

const NOW = new Date(Date.UTC(2026, 9, 19, 11, 5)) // 14:05 in Istanbul
// What goes to the sheet; the newsletter box never does
const FIELDS = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', phone: '+905321234567', helps: false, chat: false }
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
    // The code with the site's signature (2026-10-22)
    expect(mail.text).toContain(`${site.url}/en/uye-ol/onay?t=${signCode(row.token)}`)
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
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toMatch(/\/uye-ol\/onay\?t=[\w-]{43}\.[\w-]{22}&b=NEWS/)
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
  const code = 'k'.repeat(43)

  it('confirms a signed code through the sheet and passes its answer on', async () => {
    vi.mocked(confirmInSheet).mockResolvedValue('ok')
    expect(await confirmMembership(signCode(code), NOW)).toBe('ok')
    expect(confirmInSheet).toHaveBeenCalledWith(code, '2026-10-19 14:05')
    vi.mocked(confirmInSheet).mockResolvedValue('wca_taken')
    expect(await confirmMembership(signCode(code), NOW)).toBe('wca_taken')
    vi.mocked(confirmInSheet).mockResolvedValue('invalid')
    expect(await confirmMembership(signCode(code), NOW)).toBe('invalid')
  })

  it('turns away a made-up or malformed code without calling the sheet', async () => {
    expect(await confirmMembership(`${code}.${'x'.repeat(22)}`, NOW)).toBe('invalid')
    expect(await confirmMembership('short', NOW)).toBe('invalid')
    expect(await confirmMembership('', NOW)).toBe('invalid')
    expect(confirmInSheet).not.toHaveBeenCalled()
  })

  it('takes the bare code of a mail sent before the signatures, until 2026-11-05', async () => {
    vi.mocked(confirmInSheet).mockResolvedValue('ok')
    expect(confirmCode(code, Date.parse('2026-11-04T23:59:00+03:00'))).toBe(code)
    expect(confirmCode(code, Date.parse('2026-11-05T00:00:00+03:00'))).toBeNull()
    expect(confirmCode(signCode(code), Date.parse('2027-01-01T00:00:00+03:00'))).toBe(code)
  })
})

describe('requestWcaMembership (WCA ile kaydol)', () => {
  const WCA = { wcaId: '2019TEME01', ranking: true, confirmed: true, ip: '1.2.3.4' }

  it('a proved address: the row starts as a member with the WCA marks, the started mail goes, the newsletter starts', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('started')
    expect(await requestWcaMembership({ ...APP, newsletter: true }, WCA, 'en', NOW)).toBe('started')
    expect(vi.mocked(applyToSheet).mock.calls[0][0]).toMatchObject({ ...FIELDS, wcaId: '2019TEME01', wcaVerified: true, ranking: true, confirmed: true, locale: 'en' })
    expect(subscribeVerified).toHaveBeenCalledWith('ayse@example.com', 'en', '1.2.3.4', NOW.getTime())
    expect(vi.mocked(sendMail).mock.calls[0][0]).toMatchObject({ to: 'ayse@example.com', subject: 'Your membership has started' })
  })

  it('a member linked or found: no mail; the newsletter box still starts the subscription', async () => {
    for (const result of ['linked', 'member'] as const) {
      vi.mocked(applyToSheet).mockResolvedValue(result)
      expect(await requestWcaMembership({ ...APP, newsletter: true }, WCA, 'tr', NOW)).toBe(result)
    }
    expect(sendMail).not.toHaveBeenCalled()
    expect(subscribeVerified).toHaveBeenCalledTimes(2)
  })

  it('a changed address takes the confirm link, the WCA marks waiting in the row', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('pending')
    expect(await requestWcaMembership(APP, { ...WCA, confirmed: false }, 'tr', NOW)).toBe('sent')
    expect(vi.mocked(applyToSheet).mock.calls[0][0]).toMatchObject({ confirmed: false, wcaVerified: true, ranking: true })
    expect(vi.mocked(sendMail).mock.calls[0][0].subject).toBe('Üyeliğini onayla')
    expect(subscribeVerified).not.toHaveBeenCalled()
    vi.mocked(applyToSheet).mockResolvedValue('member')
    expect(await requestWcaMembership({ ...APP, newsletter: true }, { ...WCA, confirmed: false }, 'tr', NOW)).toBe('sent')
    expect(requestSubscription).toHaveBeenCalledWith('ayse@example.com', 'tr', NOW.getTime())
  })

  it('no WCA ID: no mark and no ranking; a taken WCA ID and a sheet failure pass on', async () => {
    vi.mocked(applyToSheet).mockResolvedValue('started')
    await requestWcaMembership(APP, { ...WCA, wcaId: null }, 'tr', NOW)
    expect(vi.mocked(applyToSheet).mock.calls[0][0]).toMatchObject({ wcaId: '', wcaVerified: false, ranking: false })
    vi.mocked(applyToSheet).mockResolvedValue('taken')
    expect(await requestWcaMembership(APP, WCA, 'tr', NOW)).toBe('taken')
    vi.mocked(applyToSheet).mockResolvedValue('error')
    expect(await requestWcaMembership(APP, WCA, 'tr', NOW)).toBe('error')
  })
})
