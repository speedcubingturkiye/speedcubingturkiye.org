// lib/newsletter.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelSubscription,
  cleanupPending,
  confirmSubscription,
  mailSubscribers,
  maskEmail,
  requestSubscription,
  RESEND_AFTER_MS,
} from '@/lib/newsletter'
import { CONFIRM_TTL_MS, makeToken } from '@/lib/newsletter-token'
import { confirmSubscriber, getSubscriber, listStalePending, listSubscribers, putPending, removeSubscriber, sendMail } from '@/lib/ses'
import { site } from '@/site.config'

vi.mock('@/lib/ses', () => ({
  getSubscriber: vi.fn(),
  putPending: vi.fn(),
  confirmSubscriber: vi.fn(),
  removeSubscriber: vi.fn(),
  listSubscribers: vi.fn(),
  listStalePending: vi.fn(),
  sendMail: vi.fn(),
}))

const NOW = Date.UTC(2026, 8, 29, 12)
const noPause = async () => {}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEWSLETTER_SECRET', 'a'.repeat(32))
  vi.mocked(sendMail).mockResolvedValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('kutay@gmail.com')).toBe('k***@gmail.com')
    expect(maskEmail('broken')).toBe('***')
  })
})

describe('requestSubscription', () => {
  it('writes a new address as pending and mails the confirm link in its language', async () => {
    vi.mocked(getSubscriber).mockResolvedValue(null)
    expect(await requestSubscription('a@b.com', 'en', NOW)).toBe(true)
    expect(putPending).toHaveBeenCalledWith('a@b.com', 'en', false, NOW)
    const mail = vi.mocked(sendMail).mock.calls[0][0]
    expect(mail.to).toBe('a@b.com')
    expect(mail.subject).toBe('Confirm your newsletter subscription')
    expect(mail.text).toContain(`${site.url}/en/bulten/onay?t=`)
    expect(mail.headers).toBeUndefined()
    expect(vi.mocked(putPending).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(sendMail).mock.invocationCallOrder[0])
  })

  it('sends nothing to a confirmed address and to one mailed less than 24 hours ago, and still reports success', async () => {
    vi.mocked(getSubscriber).mockResolvedValueOnce({ status: 'confirmed', locale: 'tr', updatedAt: 0 })
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(true)
    vi.mocked(getSubscriber).mockResolvedValueOnce({ status: 'pending', locale: null, updatedAt: NOW - RESEND_AFTER_MS + 60_000 })
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(true)
    expect(putPending).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('mails a pending address again after 24 hours, updating the contact', async () => {
    vi.mocked(getSubscriber).mockResolvedValue({ status: 'pending', locale: null, updatedAt: NOW - RESEND_AFTER_MS - 60_000 })
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(true)
    expect(putPending).toHaveBeenCalledWith('a@b.com', 'tr', true, NOW)
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('reports failure when SES fails or the mail is refused', async () => {
    vi.mocked(getSubscriber).mockRejectedValueOnce(new Error('TooManyRequestsException'))
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(false)
    vi.mocked(getSubscriber).mockResolvedValueOnce(null)
    vi.mocked(sendMail).mockResolvedValueOnce(false)
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(false)
  })

  it('releases the claim when the mail is refused, so a retry is not locked out for 24 hours', async () => {
    vi.mocked(getSubscriber).mockResolvedValue(null)
    vi.mocked(sendMail).mockResolvedValueOnce(false)
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(false)
    expect(removeSubscriber).toHaveBeenCalledWith('a@b.com')
  })

  it('treats a lost race for a new address as done, but any other failed claim as a failure; neither mails', async () => {
    vi.mocked(getSubscriber).mockResolvedValue(null)
    vi.mocked(putPending).mockRejectedValueOnce(Object.assign(new Error('exists'), { name: 'AlreadyExistsException' }))
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(true)
    vi.mocked(putPending).mockRejectedValueOnce(Object.assign(new Error('slow down'), { name: 'TooManyRequestsException' }))
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('writes and mails nothing when the link secret is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEWSLETTER_SECRET', '')
    vi.mocked(getSubscriber).mockResolvedValue(null)
    expect(await requestSubscription('a@b.com', 'tr', NOW)).toBe(false)
    expect(putPending).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })
})

describe('confirmSubscription', () => {
  const token = () => makeToken('onay', { email: 'a@b.com', locale: 'en' }, NOW)

  it('opts a pending address in with the time, the IP and the time the confirmation mail was requested', async () => {
    // The pending write (updatedAt) happens right before the confirmation mail, so it is the request time the KVKK notice promises.
    vi.mocked(getSubscriber).mockResolvedValue({ status: 'pending', locale: null, updatedAt: NOW })
    expect(await confirmSubscription(token(), '203.0.113.7', NOW + 60_000)).toBe(true)
    expect(confirmSubscriber).toHaveBeenCalledWith('a@b.com', 'en', {
      sentAt: new Date(NOW).toISOString(),
      confirmedAt: new Date(NOW + 60_000).toISOString(),
      ip: '203.0.113.7',
    })
  })

  it('accepts an already confirmed address without writing again', async () => {
    vi.mocked(getSubscriber).mockResolvedValue({ status: 'confirmed', locale: 'en', updatedAt: NOW })
    expect(await confirmSubscription(token(), null, NOW)).toBe(true)
    expect(confirmSubscriber).not.toHaveBeenCalled()
  })

  it('refuses an address no longer on the list, an unsubscribe token and an expired link', async () => {
    vi.mocked(getSubscriber).mockResolvedValue(null)
    expect(await confirmSubscription(token(), null, NOW)).toBe(false)
    vi.mocked(getSubscriber).mockResolvedValue({ status: 'pending', locale: null, updatedAt: NOW })
    expect(await confirmSubscription(makeToken('cikis', { email: 'a@b.com', locale: 'en' }, NOW), null, NOW)).toBe(false)
    expect(await confirmSubscription(token(), null, NOW + CONFIRM_TTL_MS + 60_000)).toBe(false)
    expect(confirmSubscriber).not.toHaveBeenCalled()
  })
})

describe('cancelSubscription', () => {
  it('deletes the address of an unsubscribe token and refuses any other token', async () => {
    expect(await cancelSubscription(makeToken('cikis', { email: 'a@b.com', locale: 'tr' }))).toBe(true)
    expect(removeSubscriber).toHaveBeenCalledWith('a@b.com')
    expect(await cancelSubscription(makeToken('onay', { email: 'a@b.com', locale: 'tr' }))).toBe(false)
    expect(await cancelSubscription('garbage')).toBe(false)
    expect(removeSubscriber).toHaveBeenCalledTimes(1)
  })
})

describe('mailSubscribers', () => {
  it('never mails from a development server: an all-zero report, nothing listed, rendered or sent', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const render = vi.fn()
    expect(await mailSubscribers(render, noPause)).toEqual({ sent: { tr: 0, en: 0 }, failed: 0 })
    expect(listSubscribers).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('[newsletter:dev] mailing skipped')
  })

  it('mails each subscriber in their language with one-click headers, counts failures and copies info@', async () => {
    vi.mocked(listSubscribers).mockImplementation(async function* (locale) {
      yield* locale === 'tr' ? ['t1@x.com', 't2@x.com'] : ['e1@x.com']
    })
    vi.mocked(sendMail).mockImplementation(async (m) => m.to !== 't2@x.com')
    const render = vi.fn((locale: 'tr' | 'en') => ({ subject: `s-${locale}`, html: '<p>h</p>', text: 't' }))
    const pause = vi.fn(noPause)
    const report = await mailSubscribers(render, pause)
    expect(report).toEqual({ sent: { tr: 1, en: 1 }, failed: 1 })
    expect(pause.mock.calls).toEqual([[100], [100], [100], [100]]) // every mail, the info@ copy included, is followed by 100 ms
    const calls = vi.mocked(sendMail).mock.calls.map(([m]) => m)
    expect(calls.map((m) => m.to)).toEqual([site.contactEmail, 't1@x.com', 't2@x.com', 'e1@x.com']) // info@ goes first
    expect(calls[3].subject).toBe('s-en')
    expect(calls[1].replyTo).toBe(site.contactEmail)
    expect(calls[1].headers?.['List-Unsubscribe']).toMatch(new RegExp(`^<${site.url}/api/bulten/cikis\\?t=[A-Za-z0-9_-]+>$`))
    expect(calls[0].subject).toBe('s-tr') // the copy is the Turkish mail, without list headers
    expect(calls[0].headers).toBeUndefined()
    const [locale, links] = render.mock.calls[3] as unknown as ['tr' | 'en', { page: string }]
    expect(locale).toBe('en')
    expect(links.page).toMatch(new RegExp(`^${site.url}/en/bulten/cikis\\?t=`))
  })

  it('sends the info@ copy before listing anyone, so a mailing that breaks off still signals the team', async () => {
    vi.mocked(listSubscribers).mockImplementation(() => {
      throw Object.assign(new Error('slow down'), { name: 'TooManyRequestsException' }) // the listing fails on the first page
    })
    const render = vi.fn(() => ({ subject: 's', html: '<p>h</p>', text: 't' }))
    await expect(mailSubscribers(render, noPause)).rejects.toMatchObject({ name: 'TooManyRequestsException' })
    expect(vi.mocked(sendMail).mock.calls.map(([m]) => m.to)).toEqual([site.contactEmail])
    expect(vi.mocked(sendMail).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(listSubscribers).mock.invocationCallOrder[0])
  })

  it('logs a refused info@ copy and still mails the subscribers; the report counts subscribers only', async () => {
    vi.mocked(listSubscribers).mockImplementation(async function* (locale) {
      yield* locale === 'tr' ? ['t1@x.com'] : []
    })
    vi.mocked(sendMail).mockImplementation(async (m) => m.to !== site.contactEmail)
    const render = vi.fn(() => ({ subject: 's', html: '<p>h</p>', text: 't' }))
    expect(await mailSubscribers(render, noPause)).toEqual({ sent: { tr: 1, en: 0 }, failed: 0 })
    expect(console.error).toHaveBeenCalledWith('newsletter copy to info@ refused')
    expect(vi.mocked(sendMail).mock.calls.map(([m]) => m.to)).toEqual([site.contactEmail, 't1@x.com'])
  })
})

describe('cleanupPending', () => {
  it('deletes unconfirmed addresses older than 7 days', async () => {
    vi.mocked(listStalePending).mockImplementation(async function* () {
      yield* ['old1@x.com', 'old2@x.com']
    })
    expect(await cleanupPending(NOW)).toBe(2)
    expect(listStalePending).toHaveBeenCalledWith(NOW - CONFIRM_TTL_MS)
    expect(vi.mocked(removeSubscriber).mock.calls.map(([e]) => e)).toEqual(['old1@x.com', 'old2@x.com'])
  })
})
