// lib/uyelik-apps-script.test.ts: the members sheet's Apps Script (scripts/uyelik-apps-script.gs), run against an
// in-memory sheet. Only the Hesabım actions are covered here; the script has no other automated check.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const HEADERS = ['Başvuru tarihi', 'Durum', 'Ad', 'Soyad', 'E-posta', 'Doğum tarihi', 'Veli onayı', 'Şehir', 'WCA ID', 'Yarışmalara yardım', 'Dil', 'Onay tarihi', 'Onay kodu']
const row = (status: string, email: string, more: Partial<Record<string, string>> = {}) =>
  HEADERS.map((h) => ({ 'Başvuru tarihi': '2026-10-20 10:00', Durum: status, Ad: 'Ayşe', Soyad: 'Yılmaz', 'E-posta': email, 'Doğum tarihi': '1990-05-04', Şehir: 'İstanbul', Dil: 'tr', ...more })[h] ?? '')

/** Loads the script against `cells` (header row first). A value written through text() keeps its apostrophe, as
 *  Sheets stores it; display values drop it, as Sheets shows it. */
function load(cells: string[][]) {
  const shown = (v: string) => (v.startsWith("'") ? v.slice(1) : v)
  const range = (r: number, c: number, nr = 1, nc = 1) => ({
    getDisplayValues: () => cells.slice(r - 1, r - 1 + nr).map((line) => line.slice(c - 1, c - 1 + nc).map(shown)),
    setValues: (values: string[][]) => values.forEach((line, i) => line.forEach((v, j) => (cells[r - 1 + i][c - 1 + j] = v))),
    setValue: (v: string) => (cells[r - 1][c - 1] = v),
  })
  const sheet = { getLastRow: () => cells.length, getRange: range, deleteRow: (r: number) => cells.splice(r - 1, 1), appendRow: (v: string[]) => cells.push(v) }
  const cache = new Map<string, string>()
  const lock = { waitLock: () => {}, releaseLock: () => {} }
  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => lock, getDocumentLock: () => lock },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 's3cret' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s: string) => ({ setMimeType: () => s }) },
  }
  const source = readFileSync(join(import.meta.dirname, '..', 'scripts', 'uyelik-apps-script.gs'), 'utf8')
  const { doPost } = new Function(...Object.keys(globals), `${source}\nreturn { doPost }`)(...Object.values(globals))
  return (action: string, body: object) =>
    JSON.parse(doPost({ postData: { contents: JSON.stringify({ secret: 's3cret', action, ...body }) } })) as { result: string; member?: unknown }
}

describe('the members sheet script, Hesabım actions', () => {
  it('get reads a member and treats an application waiting for its link as no member', () => {
    const post = load([HEADERS, row('Üye', 'ayse@example.com', { 'Veli onayı': 'Evet', 'WCA ID': '2019TEME01', Dil: 'en' }), row('Onay bekliyor', 'bekle@example.com')])
    expect(post('get', { email: 'AYSE@example.com' })).toEqual({
      result: 'ok',
      member: { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: true, city: 'İstanbul', wcaId: '2019TEME01', helps: false, locale: 'en' },
    })
    expect(post('get', { email: 'bekle@example.com' })).toEqual({ result: 'none' })
  })

  it('link answers a member once in 10 minutes and never a stranger', () => {
    const post = load([HEADERS, row('Üye', 'ayse@example.com')])
    expect(post('link', { email: 'ayse@example.com' }).result).toBe('ok')
    expect(post('link', { email: 'ayse@example.com' }).result).toBe('none')
    expect(post('link', { email: 'kim@example.com' }).result).toBe('none')
  })

  it('update writes Ad to Yarışmalara yardım as text and leaves the address and the rest alone', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com')]
    const post = load(cells)
    const fields = { firstName: 'Ayşe Nur', lastName: 'Yılmaz', birthDate: '2010-01-02', guardian: true, city: 'Ankara', wcaId: '2019TEME01', helps: true }
    expect(post('update', { email: 'ayse@example.com', ...fields }).result).toBe('ok')
    expect(cells[1]).toEqual(['2026-10-20 10:00', 'Üye', "'Ayşe Nur", "'Yılmaz", "'ayse@example.com", "'2010-01-02", "'Evet", "'Ankara", "'2019TEME01", "'Evet", 'tr', '', ''])
    expect(post('update', { email: 'kim@example.com', ...fields }).result).toBe('none')
  })

  it('changeEmail refuses an address any row has, and writes a free one in lower case', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com'), row('Onay bekliyor', 'bekle@example.com')]
    const post = load(cells)
    expect(post('changeEmail', { email: 'ayse@example.com', newEmail: 'Bekle@example.com' }).result).toBe('taken')
    expect(post('changeEmail', { email: 'ayse@example.com', newEmail: 'Yeni@Example.com' }).result).toBe('ok')
    expect(cells[1][4]).toBe("'yeni@example.com")
  })

  it('delete removes the member row only', () => {
    const cells = [HEADERS, row('Onay bekliyor', 'ayse@example.com'), row('Üye', 'ayse@example.com')]
    const post = load(cells)
    expect(post('delete', { email: 'ayse@example.com' }).result).toBe('ok')
    expect(cells.map((r) => r[1])).toEqual(['Durum', 'Onay bekliyor'])
    expect(post('delete', { email: 'ayse@example.com' }).result).toBe('none')
  })
})
