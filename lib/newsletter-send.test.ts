// lib/newsletter-send.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderNewsletter, sendNewsletter } from '@/lib/newsletter-send'
import { newsHash, readNewsForMail } from '@/lib/news'
import { mailSubscribers } from '@/lib/newsletter'
import { claimNewsletter, finishNewsletter } from '@/lib/newsletter-log'
import { site } from '@/site.config'

// The real reader and hash stay the default; single tests replace their answers.
vi.mock('@/lib/news', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/news')>()
  return { ...real, readNewsForMail: vi.fn(real.readNewsForMail), newsHash: vi.fn(real.newsHash) }
})
vi.mock('@/lib/newsletter', () => ({ mailSubscribers: vi.fn() }))
vi.mock('@/lib/newsletter-log', () => ({ claimNewsletter: vi.fn(), finishNewsletter: vi.fn() }))

const marked = {
  slug: 'haber',
  date: '2026-09-29',
  bulten: true,
  auto: false,
  title: { tr: 'Başlık', en: 'Title' },
  description: { tr: 'Özet', en: 'Summary' },
  body: { tr: 'Türkçe metin.', en: 'English text.' },
}
const HASH = 'a'.repeat(64) // the content hash the reviewers approved (scripts/pending-newsletters.ts)

describe('readNewsForMail', () => {
  it('reads a real entry with both languages and the flags', async () => {
    const news = await readNewsForMail('site-yayinda')
    expect(news).not.toBeNull()
    expect(news?.bulten).toBe(false)
    expect(news?.auto).toBe(false)
    expect(news?.title.en).toBe('speedcubingturkiye.org is live')
    expect(news?.body.tr).toContain('yayında')
    expect(await readNewsForMail('../etc')).toBeNull()
    expect(await readNewsForMail('yok-boyle-bir-haber')).toBeNull()
  })
})

describe('renderNewsletter', () => {
  it('is the news in the given language with read-more on the news page', () => {
    const en = renderNewsletter(marked, 'en', `${site.url}/en/bulten/cikis?t=x`)
    expect(en.subject).toBe('Title')
    expect(en.html).toContain('English text.')
    expect(en.html).toContain(`href="${site.url}/en/haberler/haber"`)
    expect(en.html).toContain(`href="${site.url}/en/bulten/cikis?t=x"`) // the unsubscribe address passed in
    expect(en.text).toContain(`${site.url}/en/bulten/cikis?t=x`)
    const tr = renderNewsletter(marked, 'tr', `${site.url}/bulten/cikis?t=x`)
    expect(tr.html).toContain(`href="${site.url}/haberler/haber"`)
    expect(tr.text).toContain('Türkçe metin.')
  })
})

describe('sendNewsletter', () => {
  beforeEach(() => {
    vi.mocked(readNewsForMail).mockClear()
    vi.mocked(newsHash).mockReset()
    vi.mocked(newsHash).mockResolvedValue(HASH) // the live content is what the reviewers approved
    vi.mocked(mailSubscribers).mockReset()
    vi.mocked(claimNewsletter).mockReset()
    vi.mocked(finishNewsletter).mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('answers 503 development on a development server before reading, hashing, claiming or mailing anything', async () => {
    vi.stubEnv('NODE_ENV', 'development') // next dev may hold the production ledger token and SES keys
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 503, body: { error: 'development' } })
    expect(readNewsForMail).not.toHaveBeenCalled()
    expect(newsHash).not.toHaveBeenCalled()
    expect(claimNewsletter).not.toHaveBeenCalled()
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('refuses a bad slug and news that is missing, unmarked or automatic', async () => {
    expect(await sendNewsletter('../x', HASH)).toEqual({ status: 400, body: { error: 'slug' } })
    vi.mocked(readNewsForMail).mockResolvedValueOnce(null)
    expect((await sendNewsletter('yok', HASH)).status).toBe(404)
    vi.mocked(readNewsForMail).mockResolvedValueOnce({ ...marked, bulten: false })
    expect((await sendNewsletter('haber', HASH)).status).toBe(404)
    vi.mocked(readNewsForMail).mockResolvedValueOnce({ ...marked, auto: true })
    expect((await sendNewsletter('haber', HASH)).status).toBe(404)
    expect(claimNewsletter).not.toHaveBeenCalled()
  })

  it('refuses a hash that is not 64 lowercase hex characters before reading or claiming anything', async () => {
    for (const bad of ['', 'abc', 'A'.repeat(64), 'g'.repeat(64), `${HASH}0`, ` ${HASH}`]) {
      expect(await sendNewsletter('haber', bad)).toEqual({ status: 400, body: { error: 'hash' } })
    }
    expect(readNewsForMail).not.toHaveBeenCalled()
    expect(newsHash).not.toHaveBeenCalled()
    expect(claimNewsletter).not.toHaveBeenCalled()
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('answers 409 changed without claiming or mailing when the live content is not the approved content', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(newsHash).mockResolvedValueOnce('b'.repeat(64)) // edited and deployed since the approval
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 409, body: { error: 'changed' } })
    vi.mocked(newsHash).mockResolvedValueOnce(null) // the entry's folder vanished
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 409, body: { error: 'changed' } })
    expect(newsHash).toHaveBeenCalledWith('haber')
    expect(claimNewsletter).not.toHaveBeenCalled()
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('maps a refused claim to 409, 429 or 500 without mailing', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(claimNewsletter).mockResolvedValueOnce({ ok: false, reason: 'sent' })
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 409, body: { error: 'sent' } })
    vi.mocked(claimNewsletter).mockResolvedValueOnce({ ok: false, reason: 'daily_limit' })
    expect((await sendNewsletter('haber', HASH)).status).toBe(429)
    vi.mocked(claimNewsletter).mockResolvedValueOnce({ ok: false, reason: 'conflict' })
    expect((await sendNewsletter('haber', HASH)).status).toBe(409)
    vi.mocked(claimNewsletter).mockResolvedValueOnce({ ok: false, reason: 'error' })
    expect((await sendNewsletter('haber', HASH)).status).toBe(500)
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('mails each language and logs the counts', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(claimNewsletter).mockResolvedValue({ ok: true })
    vi.mocked(finishNewsletter).mockResolvedValue(true)
    const links = { page: 'https://x/u', oneClick: 'https://x/o' }
    let rendered: ReturnType<typeof renderNewsletter> | undefined
    vi.mocked(mailSubscribers).mockImplementation(async (render) => {
      rendered = render('en', links)
      return { sent: { tr: 2, en: 1 }, failed: 0 }
    })
    expect(await sendNewsletter('haber', HASH, 1000)).toEqual({ status: 200, body: { slug: 'haber', sent: { tr: 2, en: 1 }, failed: 0, logged: true } })
    expect(claimNewsletter).toHaveBeenCalledWith('haber', 1000)
    expect(finishNewsletter).toHaveBeenCalledWith('haber', { sent: { tr: 2, en: 1 }, failed: 0 })
    // The footer link opens the page with the button (links.page); the one-click address belongs in the List-Unsubscribe header only.
    expect(rendered?.subject).toBe('Title')
    expect(rendered?.html).toContain(`href="${links.page}"`)
    expect(rendered?.html).not.toContain(links.oneClick)
    expect(rendered?.text).toContain(links.page)
    expect(rendered?.text).not.toContain(links.oneClick)
  })

  it('answers 500 when the mailing breaks off, leaving the start entry (no retry, no double mails)', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(claimNewsletter).mockResolvedValue({ ok: true })
    vi.mocked(mailSubscribers).mockRejectedValue(new Error('TooManyRequestsException'))
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 500, body: { error: 'send_failed' } })
    expect(finishNewsletter).not.toHaveBeenCalled()
  })

  it('answers 500 without mailing when the ledger cannot be read', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(claimNewsletter).mockRejectedValue(new Error('GitHub GET failed'))
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 500, body: { error: 'error' } })
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('still answers 200 when the mails went out but the ledger update failed', async () => {
    vi.mocked(readNewsForMail).mockResolvedValue(marked)
    vi.mocked(claimNewsletter).mockResolvedValue({ ok: true })
    vi.mocked(mailSubscribers).mockResolvedValue({ sent: { tr: 1, en: 0 }, failed: 0 })
    vi.mocked(finishNewsletter).mockRejectedValue(new Error('GitHub GET failed'))
    expect(await sendNewsletter('haber', HASH)).toEqual({ status: 200, body: { slug: 'haber', sent: { tr: 1, en: 0 }, failed: 0, logged: false } })
  })
})
