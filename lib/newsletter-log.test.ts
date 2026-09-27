// lib/newsletter-log.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blockReason, claimNewsletter, DAILY_GAP_MS, finishNewsletter, parseLog, pendingSlugs, serializeLog } from '@/lib/newsletter-log'
import { readRepoFile, writeRepoFile } from '@/lib/github'

vi.mock('@/lib/github', () => ({ readRepoFile: vi.fn(), writeRepoFile: vi.fn() }))

const NOW = Date.UTC(2026, 8, 29, 12)
const iso = (ms: number) => new Date(ms).toISOString()

beforeEach(() => {
  vi.resetAllMocks()
})

describe('parseLog / serializeLog', () => {
  it('reads a missing file as empty and writes 2-space JSON with a newline', () => {
    expect(parseLog(undefined)).toEqual({ sent: [] })
    const log = { sent: [{ slug: 'a', startedAt: iso(NOW) }] }
    expect(parseLog(serializeLog(log))).toEqual(log)
    expect(serializeLog({ sent: [] })).toBe('{\n  "sent": []\n}\n')
  })
})

describe('blockReason', () => {
  it('blocks a slug already in the log and any newsletter within 24 hours of the last one', () => {
    const log = { sent: [{ slug: 'eski', startedAt: iso(NOW - DAILY_GAP_MS + 60_000) }] }
    expect(blockReason(log, 'eski', NOW)).toBe('sent')
    expect(blockReason(log, 'yeni', NOW)).toBe('daily_limit')
    expect(blockReason(log, 'yeni', NOW + 120_000)).toBeNull()
  })
})

describe('pendingSlugs', () => {
  it('lists marked, hand-written, unlogged news, oldest first', () => {
    const entries = [
      { slug: 'b', date: '2026-09-28', bulten: true, auto: false },
      { slug: 'a', date: '2026-09-20', bulten: true, auto: false },
      { slug: 'gonderildi', date: '2026-09-01', bulten: true, auto: false },
      { slug: 'isaretsiz', date: '2026-09-01', bulten: false, auto: false },
      { slug: 'yarisma-x', date: '2026-09-01', bulten: true, auto: true },
    ]
    expect(pendingSlugs(entries, { sent: [{ slug: 'gonderildi', startedAt: iso(NOW) }] })).toEqual(['a', 'b'])
  })
})

describe('claimNewsletter', () => {
  it('writes the start entry with the sha it read', async () => {
    vi.mocked(readRepoFile).mockResolvedValue({ text: '{"sent":[]}', sha: 'abc' })
    vi.mocked(writeRepoFile).mockResolvedValue('ok')
    expect(await claimNewsletter('haber', NOW)).toEqual({ ok: true })
    const [path, text, message, sha] = vi.mocked(writeRepoFile).mock.calls[0]
    expect(path).toBe('content/newsletter-log.json')
    expect(parseLog(text)).toEqual({ sent: [{ slug: 'haber', startedAt: iso(NOW) }] })
    expect(message).toBe('chore(newsletter): start haber')
    expect(sha).toBe('abc')
  })

  it('refuses without writing when the log blocks it, and reports a conflict', async () => {
    vi.mocked(readRepoFile).mockResolvedValue({ text: JSON.stringify({ sent: [{ slug: 'haber', startedAt: iso(NOW - 5 * DAILY_GAP_MS) }] }), sha: 'abc' })
    expect(await claimNewsletter('haber', NOW)).toEqual({ ok: false, reason: 'sent' })
    expect(writeRepoFile).not.toHaveBeenCalled()
    vi.mocked(readRepoFile).mockResolvedValue(null)
    vi.mocked(writeRepoFile).mockResolvedValue('conflict')
    expect(await claimNewsletter('diger', NOW)).toEqual({ ok: false, reason: 'conflict' })
    expect(vi.mocked(writeRepoFile).mock.calls[0][3]).toBeNull()
  })
})

describe('finishNewsletter', () => {
  it('completes the entry with the counts, retrying once on a conflict', async () => {
    vi.mocked(readRepoFile).mockResolvedValue({ text: JSON.stringify({ sent: [{ slug: 'haber', startedAt: iso(NOW) }] }), sha: 's1' })
    vi.mocked(writeRepoFile).mockResolvedValueOnce('conflict').mockResolvedValueOnce('ok')
    expect(await finishNewsletter('haber', { sent: { tr: 3, en: 1 }, failed: 1 }, NOW + 60_000)).toBe(true)
    expect(writeRepoFile).toHaveBeenCalledTimes(2)
    const text = vi.mocked(writeRepoFile).mock.calls[1][1]
    expect(parseLog(text).sent[0]).toEqual({ slug: 'haber', startedAt: iso(NOW), finishedAt: iso(NOW + 60_000), sent: { tr: 3, en: 1 }, failed: 1 })
  })
})
