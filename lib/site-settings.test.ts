// lib/site-settings.test.ts
import { describe, expect, it } from 'vitest'
import { parseSiteSettings, site } from '@/site.config'

const ok = {
  channels: { instagram: 'https://instagram.com/x' },
  dataController: { name: 'Ad Soyad', email: 'a@b.org' },
  board: [{ name: 'Ad', roleTr: 'Başkan', roleEn: 'Chair', wcaId: '2019TEME01' }],
  boardUpdatedAt: '2026-09-25',
  documents: [{ titleTr: 'Tüzük', titleEn: 'Bylaws', date: '2026-09-01', file: '/docs/tuzuk-tr.pdf' }],
}

describe('parseSiteSettings', () => {
  it('maps the panel shape to the site shape and fills empty channels', () => {
    expect(parseSiteSettings(ok)).toEqual({
      channels: { instagram: 'https://instagram.com/x', discord: '', whatsapp: '', youtube: '', x: '', github: '', tiktok: '' },
      dataController: { name: 'Ad Soyad', email: 'a@b.org' },
      board: [{ name: 'Ad', role: { tr: 'Başkan', en: 'Chair' }, wcaId: '2019TEME01' }],
      boardUpdatedAt: '2026-09-25',
      documents: [{ title: { tr: 'Tüzük', en: 'Bylaws' }, date: '2026-09-01', file: '/docs/tuzuk-tr.pdf' }],
    })
    expect(parseSiteSettings({ ...ok, board: [{ name: 'Ad', roleTr: 'Üye', roleEn: 'Member' }] }).board).toEqual([{ name: 'Ad', role: { tr: 'Üye', en: 'Member' } }])
  })

  it('rejects bad values naming the file and field', () => {
    expect(() => parseSiteSettings({ ...ok, channels: { instagram: 'http://x' } })).toThrow('content/site.json: channels.instagram "https://" ile başlamalı')
    expect(() => parseSiteSettings({ ...ok, dataController: { name: '', email: 'a@b.org' } })).toThrow('dataController.name boş olamaz')
    expect(() => parseSiteSettings({ ...ok, dataController: { name: 'X', email: 'nope' } })).toThrow('dataController.email geçerli bir e-posta olmalı')
    expect(() => parseSiteSettings({ ...ok, boardUpdatedAt: '25.09.2026' })).toThrow('boardUpdatedAt YYYY-AA-GG')
    expect(() => parseSiteSettings({ ...ok, board: [{ name: 'A', roleTr: 'B', roleEn: 'C', wcaId: 'nope' }] })).toThrow('board[1] "wcaId"')
    expect(() => parseSiteSettings({ ...ok, board: [{ name: 'A', roleTr: 'B' }] })).toThrow('board[1] "roleTr" ve "roleEn"')
    expect(() => parseSiteSettings({ ...ok, documents: [{ titleTr: 'T', titleEn: 'T', date: '2026-01-01', file: 'tuzuk.pdf' }] })).toThrow('documents[1] "file" "/docs/" ile başlamalı')
    expect(() => parseSiteSettings([])).toThrow('content/site.json: bir JSON nesnesi bekleniyor')
  })

  it('parses the repo file; the code settings stay in code', () => {
    expect(site.url).toBe('https://speedcubingturkiye.org')
    expect(site.name).toBe('Speedcubing Türkiye')
    expect(site.dataController.email).toContain('@')
    expect(Object.keys(site.channels)).toEqual(['instagram', 'discord', 'whatsapp', 'youtube', 'x', 'github', 'tiktok'])
  })
})
