// lib/newsletter-sheet.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshForSheet, SHEET_DELETE_MAX } from '@/lib/newsletter-sheet'
import { listConfirmed, removeSubscriber } from '@/lib/ses'

vi.mock('@/lib/ses', () => ({ listConfirmed: vi.fn(), removeSubscriber: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('refreshForSheet', () => {
  it('deletes the ticked addresses first, then lists every subscriber newest first in Istanbul time', async () => {
    const order: string[] = []
    vi.mocked(removeSubscriber).mockImplementation(async (email) => void order.push(`rm ${email}`))
    vi.mocked(listConfirmed).mockImplementation(async function* () {
      order.push('list')
      yield { email: 'old@x.com', locale: 'tr' as const, updatedAt: Date.UTC(2026, 9, 1, 9) }
      yield { email: 'new@x.com', locale: 'en' as const, updatedAt: Date.UTC(2026, 9, 20, 9, 5) }
    })
    expect(await refreshForSheet(['gone@x.com'])).toEqual([
      { eposta: 'new@x.com', dil: 'en', tarih: '2026-10-20 12:05' },
      { eposta: 'old@x.com', dil: 'tr', tarih: '2026-10-01 12:00' },
    ])
    expect(order).toEqual(['rm gone@x.com', 'list'])
  })

  it('deletes only well-formed addresses, at most SHEET_DELETE_MAX a call', async () => {
    vi.mocked(listConfirmed).mockImplementation(async function* () {})
    await refreshForSheet(['a@b.com', 'not-an-email', 42, ...Array.from({ length: 50 }, (_, i) => `u${i}@x.com`)])
    expect(removeSubscriber).toHaveBeenCalledTimes(SHEET_DELETE_MAX)
    expect(removeSubscriber).toHaveBeenNthCalledWith(1, 'a@b.com')
    expect(removeSubscriber).toHaveBeenNthCalledWith(2, 'u0@x.com')
    await refreshForSheet(undefined)
    await refreshForSheet({ sil: 'a@b.com' })
    expect(removeSubscriber).toHaveBeenCalledTimes(SHEET_DELETE_MAX)
  })
})
