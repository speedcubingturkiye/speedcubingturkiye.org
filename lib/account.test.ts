// lib/account.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmEmailChange, leaveMembership, readAccountToken, requestAccountLink, requestEmailChange } from '@/lib/account'
import { changeMemberEmail, deleteMember, linkFromSheet } from '@/lib/membership-sheet'
import { moveSubscription } from '@/lib/newsletter'
import { makeToken } from '@/lib/newsletter-token'
import { removeSubscriber, sendMail } from '@/lib/ses'
import { site } from '@/site.config'

vi.mock('@/lib/membership-sheet', () => ({ linkFromSheet: vi.fn(), changeMemberEmail: vi.fn(), deleteMember: vi.fn() }))
vi.mock('@/lib/ses', () => ({ sendMail: vi.fn(), removeSubscriber: vi.fn() }))
vi.mock('@/lib/newsletter', () => ({ moveSubscription: vi.fn() }))

const NOW = Date.UTC(2026, 9, 21, 12)
const tokenIn = (text: string, path: string) => text.match(new RegExp(`${path}\\?t=([\\w-]+)`))?.[1] ?? ''

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEWSLETTER_SECRET', 'a'.repeat(32))
  vi.mocked(sendMail).mockResolvedValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('requestAccountLink', () => {
  it('mails a member a one-hour Hesabım link in their language', async () => {
    vi.mocked(linkFromSheet).mockResolvedValue('ok')
    expect(await requestAccountLink('ayse@example.com', 'en', NOW)).toBe(true)
    const mail = vi.mocked(sendMail).mock.calls[0][0]
    expect(mail.to).toBe('ayse@example.com')
    expect(mail.text).toContain(`${site.url}/en/hesabim?t=`)
    expect(readAccountToken(tokenIn(mail.text, 'hesabim'), NOW)).toEqual({ email: 'ayse@example.com', locale: 'en' })
  })

  it('sends nothing to a stranger or within 10 minutes and still reports success; fails only with the sheet', async () => {
    vi.mocked(linkFromSheet).mockResolvedValue('none')
    expect(await requestAccountLink('kim@example.com', 'tr', NOW)).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
    vi.mocked(linkFromSheet).mockResolvedValue('error')
    expect(await requestAccountLink('kim@example.com', 'tr', NOW)).toBe(false)
  })
})

describe('the address change', () => {
  it('mails the new address its link, then changes the row and tells the old address', async () => {
    expect(await requestEmailChange('ayse@example.com', 'yeni@example.com', 'tr', NOW)).toBe(true)
    const link = vi.mocked(sendMail).mock.calls[0][0]
    expect(link.to).toBe('yeni@example.com')
    vi.mocked(changeMemberEmail).mockResolvedValue('ok')
    expect(await confirmEmailChange(tokenIn(link.text, 'hesabim/eposta'), '1.2.3.4', NOW + 60_000)).toBe('ok')
    expect(changeMemberEmail).toHaveBeenCalledWith('ayse@example.com', 'yeni@example.com')
    // The newsletter follows, with the change link as the new address's double opt-in
    expect(moveSubscription).toHaveBeenCalledWith('ayse@example.com', 'yeni@example.com', {
      sentAt: new Date(NOW).toISOString(),
      confirmedAt: new Date(NOW + 60_000).toISOString(),
      ip: '1.2.3.4',
    })
    expect(vi.mocked(sendMail).mock.calls[1][0].to).toBe('ayse@example.com')
  })

  it('answers taken and invalid without a word to the old address', async () => {
    const token = makeToken('eposta', { email: 'ayse@example.com', newEmail: 'yeni@example.com', locale: 'tr' }, NOW)
    vi.mocked(changeMemberEmail).mockResolvedValue('taken')
    expect(await confirmEmailChange(token, null, NOW)).toBe('taken')
    vi.mocked(changeMemberEmail).mockResolvedValue('none')
    expect(await confirmEmailChange(token, null, NOW)).toBe('invalid')
    expect(await confirmEmailChange(makeToken('hesap', { email: 'ayse@example.com', locale: 'tr' }, NOW), null, NOW)).toBe('invalid')
    expect(sendMail).not.toHaveBeenCalled()
    expect(moveSubscription).not.toHaveBeenCalled()
  })
})

describe('leaveMembership', () => {
  it('deletes the row, and the newsletter contact only when asked and the row is gone', async () => {
    vi.mocked(deleteMember).mockResolvedValue('ok')
    expect(await leaveMembership('ayse@example.com', false)).toBe('ok')
    expect(removeSubscriber).not.toHaveBeenCalled()
    expect(await leaveMembership('ayse@example.com', true)).toBe('ok')
    expect(removeSubscriber).toHaveBeenCalledWith('ayse@example.com')
    vi.mocked(removeSubscriber).mockClear()
    vi.mocked(deleteMember).mockResolvedValue('none')
    expect(await leaveMembership('ayse@example.com', true)).toBe('none')
    expect(removeSubscriber).not.toHaveBeenCalled()
  })
})
