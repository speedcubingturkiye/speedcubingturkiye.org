// lib/uyelik-apps-script.test.ts: the members sheet's Apps Script (scripts/uyelik-apps-script.gs), run against an
// in-memory sheet. Only the Hesabım, WCA and il sıralaması actions are covered here; the script has no other
// automated check.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const HEADERS = ['Başvuru tarihi', 'Durum', 'Ad', 'Soyad', 'E-posta', 'Doğum tarihi', 'Veli onayı', 'Şehir', 'WCA ID', 'Yarışmalara yardım', 'Dil', 'Onay tarihi', 'Onay kodu', 'WCA doğrulandı', 'İl sıralaması', 'İl tarihi', 'Üye no']
const row = (status: string, email: string, more: Partial<Record<string, string>> = {}) =>
  HEADERS.map((h) => ({ 'Başvuru tarihi': '2026-10-20 10:00', Durum: status, Ad: 'Ayşe', Soyad: 'Yılmaz', 'E-posta': email, 'Doğum tarihi': '1990-05-04', Şehir: 'İstanbul', Dil: 'tr', ...more })[h] ?? '')

/** Loads the script against `cells` (header row first). A value written through text() keeps its apostrophe, as
 *  Sheets stores it; display values drop it, as Sheets shows it. `counters`: the Üye no counters already in the script's
 *  properties. */
function load(cells: string[][], counters: Record<string, string> = {}) {
  const shown = (v: string) => (v.startsWith("'") ? v.slice(1) : v)
  const range = (r: number, c: number, nr = 1, nc = 1) => ({
    getDisplayValues: () => cells.slice(r - 1, r - 1 + nr).map((line) => line.slice(c - 1, c - 1 + nc).map(shown)),
    getDisplayValue: () => shown(cells[r - 1]?.[c - 1] ?? ''),
    setValues: (values: string[][]) => values.forEach((line, i) => line.forEach((v, j) => (cells[r - 1 + i][c - 1 + j] = v))),
    setValue: (v: string) => (cells[r - 1][c - 1] = v),
  })
  const sheet = { getLastRow: () => cells.length, getRange: range, deleteRow: (r: number) => cells.splice(r - 1, 1), appendRow: (v: string[]) => cells.push(v) }
  const cache = new Map<string, string>()
  const props = new Map<string, string>([['SECRET', 's3cret'], ...Object.entries(counters)])
  const lock = { waitLock: () => {}, releaseLock: () => {} }
  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => lock, getDocumentLock: () => lock },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }) },
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
      member: {
        firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse@example.com', birthDate: '1990-05-04', guardian: true, city: 'İstanbul', wcaId: '2019TEME01', helps: false, locale: 'en',
        wcaVerified: false, ranking: false, cityLockedUntil: '', memberNo: '2026-0001',
      },
    })
    expect(post('get', { email: 'bekle@example.com' })).toEqual({ result: 'none' })
  })

  it('link answers a member once in 10 minutes and never a stranger', () => {
    const post = load([HEADERS, row('Üye', 'ayse@example.com')])
    expect(post('link', { email: 'ayse@example.com' }).result).toBe('ok')
    expect(post('link', { email: 'ayse@example.com' }).result).toBe('none')
    expect(post('link', { email: 'kim@example.com' }).result).toBe('none')
  })

  it('update writes Ad to Yarışmalara yardım as text and leaves the address, the WCA ID and the rest alone', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com')]
    const post = load(cells)
    // A WCA ID sent along is ignored: it comes only from a WCA login (spec 2026-10-21, WCA ile kaydol)
    const fields = { firstName: 'Ayşe Nur', lastName: 'Yılmaz', birthDate: '2010-01-02', guardian: true, city: 'Ankara', wcaId: '2019TEME01', helps: true }
    expect(post('update', { email: 'ayse@example.com', ...fields }).result).toBe('ok')
    expect(cells[1]).toEqual(['2026-10-20 10:00', 'Üye', "'Ayşe Nur", "'Yılmaz", "'ayse@example.com", "'2010-01-02", "'Evet", "'Ankara", '', "'Evet", 'tr', '', '', '', '', '', "'2026-0001"])
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

const STAMP = '2026-10-21 12:00'
const cell = (cells: string[][], i: number, h: string) => cells[i][HEADERS.indexOf(h)]
const FIELDS = { firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-05-04', guardian: false, city: 'İstanbul', helps: false }
const verified = { 'WCA ID': '2019TEME01', 'WCA doğrulandı': STAMP }

describe('the members sheet script, WCA and il sıralaması (spec 2026-10-21, Parça 2)', () => {
  it('adds the N to P headers to a sheet made before them', () => {
    const cells = [HEADERS.slice(0, 13), row('Üye', 'ayse@example.com')]
    load(cells)('get', { email: 'ayse@example.com' })
    expect(cells[0]).toEqual(HEADERS)
  })

  it('get tells the WCA mark, the ranking and until when the city is locked', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-01T09:00:00Z'))
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { ...verified, 'İl sıralaması': STAMP, 'İl tarihi': STAMP })]
    expect(load(cells)('get', { email: 'ayse@example.com' }).member).toMatchObject({ wcaVerified: true, ranking: true, cityLockedUntil: '2027-10-21' })
    vi.useRealTimers()
  })

  it('linkWca verifies the ID of the WCA login unless another member verified it first; a new ID leaves the ranking', () => {
    const cells = [
      HEADERS,
      row('Üye', 'ayse@example.com', { 'WCA ID': '2019TEME01', 'İl sıralaması': STAMP }),
      row('Üye', 'ali@example.com', { 'WCA ID': '2020ALIO01', 'WCA doğrulandı': STAMP }),
    ]
    const post = load(cells)
    expect(post('linkWca', { email: 'ayse@example.com', wcaId: '2020ALIO01', at: STAMP }).result).toBe('taken')
    expect(post('linkWca', { email: 'ayse@example.com', wcaId: '2019TEME01', at: STAMP }).result).toBe('ok')
    expect([cell(cells, 1, 'WCA doğrulandı'), cell(cells, 1, 'İl sıralaması')]).toEqual([`'${STAMP}`, STAMP])
    expect(post('linkWca', { email: 'ayse@example.com', wcaId: '2021AYSE01', at: STAMP }).result).toBe('ok')
    expect([cell(cells, 1, 'WCA ID'), cell(cells, 1, 'İl sıralaması')]).toEqual(["'2021AYSE01", ''])
    expect(post('linkWca', { email: 'kim@example.com', wcaId: '2021AYSE01', at: STAMP }).result).toBe('none')
  })

  it('update never touches the WCA ID or its mark', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { ...verified, 'İl sıralaması': STAMP, 'İl tarihi': STAMP })]
    expect(load(cells)('update', { email: 'ayse@example.com', ...FIELDS, wcaId: '2019TEME02', at: STAMP }).result).toBe('ok')
    expect(cell(cells, 1, 'WCA ID')).toBe("'2019TEME01")
    expect(cells[1].slice(13, 16)).toEqual([STAMP, STAMP, STAMP])
  })

  it('unlinkWca clears the WCA ID, its mark and the ranking and keeps the city lock', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { ...verified, 'İl sıralaması': STAMP, 'İl tarihi': STAMP })]
    expect(load(cells)('unlinkWca', { email: 'ayse@example.com' }).result).toBe('ok')
    expect(cell(cells, 1, 'WCA ID')).toBe('')
    expect(cells[1].slice(13, 16)).toEqual(['', '', STAMP])
  })

  it('ranking takes a verified member, abroad too, starts the lock once, and lets them out', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { 'WCA ID': '2019TEME01' }), row('Üye', 'ali@example.com', { ...verified, Şehir: 'Yurt dışı' })]
    const post = load(cells)
    const join = (email: string, at = STAMP) => post('ranking', { email, join: true, at }).result
    expect(join('ayse@example.com')).toBe('not_allowed') // not verified
    expect(join('ali@example.com')).toBe('ok') // abroad is a list of its own (2026-10-22)
    cells[1][HEADERS.indexOf('WCA doğrulandı')] = STAMP
    expect(join('ayse@example.com')).toBe('ok')
    expect(cells[1].slice(13, 16)).toEqual([STAMP, `'${STAMP}`, `'${STAMP}`])
    expect(post('ranking', { email: 'ayse@example.com', join: false, at: STAMP }).result).toBe('ok')
    expect(cell(cells, 1, 'İl sıralaması')).toBe('')
    expect(join('ayse@example.com', '2027-01-01 09:00')).toBe('ok')
    expect(cell(cells, 1, 'İl tarihi')).toBe(`'${STAMP}`) // a running lock is not renewed
  })

  it('update refuses a new city for 365 days from İl tarihi, in the ranking or not; a move inside the ranking after that starts a new lock', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { ...verified, 'İl tarihi': STAMP })]
    const post = load(cells)
    const move = (city: string, at: string) => post('update', { email: 'ayse@example.com', ...FIELDS, city, at }).result
    expect(move('Ankara', '2027-10-21 11:59')).toBe('locked')
    expect(cell(cells, 1, 'Şehir')).toBe('İstanbul')
    expect(move('İstanbul', '2027-10-21 11:59')).toBe('ok') // the same city is no move
    expect(move('Ankara', '2027-10-21 12:00')).toBe('ok')
    expect(cell(cells, 1, 'İl tarihi')).toBe(STAMP) // out of the ranking: no new lock
    cells[1][HEADERS.indexOf('İl sıralaması')] = STAMP
    expect(move('İzmir', '2027-10-21 12:00')).toBe('ok')
    expect(cell(cells, 1, 'İl tarihi')).toBe("'2027-10-21 12:00")
    expect(move('Yurt dışı', '2029-01-01 09:00')).toBe('ok')
    // abroad stays in the ranking, in its own list, with a new lock
    expect([cell(cells, 1, 'İl sıralaması'), cell(cells, 1, 'İl tarihi')]).toEqual([STAMP, "'2029-01-01 09:00"])
  })

  it('rankingMembers lists the verified members in the ranking with their province', () => {
    const cells = [
      HEADERS,
      row('Üye', 'a@example.com', { 'WCA ID': '2019AAAA01', 'WCA doğrulandı': STAMP, 'İl sıralaması': STAMP }),
      row('Üye', 'b@example.com', { 'WCA ID': '2019BBBB01', 'WCA doğrulandı': STAMP }),
      row('Üye', 'c@example.com', { 'WCA ID': '2019CCCC01', 'İl sıralaması': STAMP }),
      row('Onay bekliyor', 'd@example.com', { 'WCA ID': '2019DDDD01', 'WCA doğrulandı': STAMP, 'İl sıralaması': STAMP }),
    ]
    expect(load(cells)('rankingMembers', {})).toEqual({ result: 'ok', members: [{ wcaId: '2019AAAA01', il: 'İstanbul' }] })
  })
})

describe('the members sheet script, WCA ile kaydol (spec 2026-10-21)', () => {
  const APPLY = { token: 't'.repeat(43), at: STAMP, firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-05-04', guardian: false, city: 'Ankara', helps: false, locale: 'tr' }
  const wca = (more: object = {}) => ({ ...APPLY, email: 'ayse@example.com', wcaId: '2019TEME01', wcaVerified: true, ranking: true, confirmed: true, ...more })

  it('a proved address starts a member row with the WCA mark and the ranking', () => {
    const cells = [HEADERS]
    expect(load(cells)('apply', wca()).result).toBe('started')
    expect([cell(cells, 1, 'Durum'), cell(cells, 1, 'WCA ID'), cell(cells, 1, 'Onay tarihi')]).toEqual(["'Üye", "'2019TEME01", `'${STAMP}`])
    expect(cells[1].slice(13, 16)).toEqual([`'${STAMP}`, `'${STAMP}`, `'${STAMP}`])
  })

  it('a changed address waits for its link with the WCA mark and the ranking ready, abroad too', () => {
    const cells = [HEADERS]
    expect(load(cells)('apply', wca({ confirmed: false, city: 'Yurt dışı' })).result).toBe('pending')
    expect([cell(cells, 1, 'Durum'), cell(cells, 1, 'Onay tarihi'), cell(cells, 1, 'Üye no')]).toEqual(["'Onay bekliyor", '', ''])
    expect(cells[1].slice(13, 16)).toEqual([`'${STAMP}`, `'${STAMP}`, `'${STAMP}`])
  })

  it('a proved address that is already a member gets the WCA ID and the ranking, nothing else', () => {
    const cells = [HEADERS, row('Üye', 'ayse@example.com', { Ad: 'Ayşe Nur' })]
    expect(load(cells)('apply', wca({ firstName: 'Başka' })).result).toBe('linked')
    expect([cell(cells, 1, 'Ad'), cell(cells, 1, 'WCA ID')]).toEqual(['Ayşe Nur', "'2019TEME01"])
    expect(cells[1].slice(13, 16)).toEqual([`'${STAMP}`, `'${STAMP}`, `'${STAMP}`])
    expect(load(cells)('apply', wca({ wcaVerified: false, wcaId: '', ranking: false })).result).toBe('member') // no WCA ID to link
    expect(load(cells)('apply', wca({ confirmed: false })).result).toBe('member') // the address is not proved
  })

  it('refuses a WCA ID another member verified, but not one a pending row holds', () => {
    const cells = [HEADERS, row('Onay bekliyor', 'bekle@example.com', { 'WCA ID': '2019TEME01', 'WCA doğrulandı': STAMP })]
    expect(load(cells)('apply', wca()).result).toBe('started')
    const taken = [HEADERS, row('Üye', 'ali@example.com', { 'WCA ID': '2019TEME01', 'WCA doğrulandı': STAMP })]
    expect(load(taken)('apply', wca()).result).toBe('taken')
    expect(taken).toHaveLength(2)
  })

  it('a proved address overwrites its own pending application at once; a typed one keeps the 24-hour rule', () => {
    const cells = [HEADERS, row('Onay bekliyor', 'ayse@example.com', { 'Başvuru tarihi': STAMP })]
    expect(load(cells)('apply', wca({ confirmed: false, ranking: false })).result).toBe('recent')
    expect(load(cells)('apply', wca()).result).toBe('started')
    expect(cell(cells, 1, 'Durum')).toBe("'Üye")
  })

  it('a typed application stays as today: pending, no WCA marks', () => {
    const cells = [HEADERS]
    expect(load(cells)('apply', { ...APPLY, email: 'kim@example.com', wcaId: '' }).result).toBe('pending')
    expect([cell(cells, 1, 'WCA ID'), ...cells[1].slice(13, 16)]).toEqual(['', '', '', ''])
  })
})

describe('the members sheet script, the security package (2026-10-22)', () => {
  const APPLY = { token: 't'.repeat(43), at: STAMP, firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-05-04', guardian: false, city: 'Ankara', wcaId: '', helps: false, locale: 'tr' }

  it('one mailbox is one member, however its address is written', () => {
    const cells = [HEADERS, row('Üye', 'kutaytemel@gmail.com'), row('Üye', 'ali@outlook.com')]
    const post = load(cells)
    expect(post('get', { email: 'Kutay.Temel+spam@googlemail.com' }).result).toBe('ok')
    expect(post('apply', { ...APPLY, email: 'kutay.temel@gmail.com' }).result).toBe('member')
    expect(post('get', { email: 'ali+cubing@outlook.com' }).result).toBe('ok')
    expect(post('get', { email: 'a.li@outlook.com' }).result).toBe('none') // dots count outside Gmail
    expect(post('changeEmail', { email: 'ali@outlook.com', newEmail: 'KUTAY.temel@gmail.com' }).result).toBe('taken')
    expect(post('apply', { ...APPLY, email: 'Yeni.Uye+x@gmail.com' }).result).toBe('pending')
    expect(cell(cells, 3, 'E-posta')).toBe("'yeniuye@gmail.com")
  })

  it('emailGate lets a member mail a new mailbox once in 10 minutes, and nobody else', () => {
    const post = load([HEADERS, row('Üye', 'ayse@example.com')])
    expect(post('emailGate', { email: 'ayse@example.com', newEmail: 'kurban@gmail.com' }).result).toBe('ok')
    expect(post('emailGate', { email: 'ayse@example.com', newEmail: 'Kur.Ban+2@gmail.com' }).result).toBe('wait')
    expect(post('emailGate', { email: 'ayse@example.com', newEmail: 'baska@example.com' }).result).toBe('ok')
    expect(post('emailGate', { email: 'kim@example.com', newEmail: 'x@example.com' }).result).toBe('none')
  })

  it('confirm begins the membership without a WCA ID another member verified meanwhile', () => {
    const marks = { 'WCA ID': '2019TEME01', 'WCA doğrulandı': STAMP, 'İl sıralaması': STAMP, 'İl tarihi': STAMP }
    const cells = [
      HEADERS,
      row('Üye', 'ali@example.com', { 'WCA ID': '2019TEME01', 'WCA doğrulandı': STAMP }),
      row('Onay bekliyor', 'ayse@example.com', { ...marks, 'Onay kodu': 'k'.repeat(43), 'Başvuru tarihi': STAMP }),
      row('Onay bekliyor', 'veli@example.com', { 'Onay kodu': 'v'.repeat(43), 'Başvuru tarihi': STAMP }),
    ]
    const post = load(cells)
    expect(post('confirm', { token: 'k'.repeat(43), at: STAMP })).toEqual({ result: 'ok', wca: 'taken' })
    expect([cell(cells, 2, 'Durum'), cell(cells, 2, 'WCA ID'), ...cells[2].slice(13, 16)]).toEqual(['Üye', '', '', '', ''])
    expect(post('confirm', { token: 'v'.repeat(43), at: STAMP })).toEqual({ result: 'ok' })
  })

  it('numbers the members by the year and the order their memberships began, never twice', () => {
    const cells = [
      HEADERS,
      row('Üye', 'b@example.com', { 'Onay tarihi': '2026-10-21 09:00' }),
      row('Üye', 'a@example.com', { 'Onay tarihi': '2026-10-19 09:00' }),
      row('Onay bekliyor', 'c@example.com'),
      row('Asıl Üye', 'd@example.com', { 'Başvuru tarihi': '2025-12-01 10:00' }),
      row('Üye', 'e@example.com', { 'Üye no': '2024-0042' }), // typed in by the Secretary
    ]
    const post = load(cells, { 'uyeNo:2026': '7' })
    expect(post('get', { email: 'a@example.com' }).member).toMatchObject({ memberNo: '2026-0008' })
    expect(cells.slice(1).map((r) => r[HEADERS.indexOf('Üye no')])).toEqual(["'2026-0009", "'2026-0008", '', "'2025-0001", '2024-0042'])
    expect(post('delete', { email: 'b@example.com' }).result).toBe('ok')
    expect(post('apply', { ...APPLY, email: 'yeni@example.com', wcaId: '2019YENI01', wcaVerified: true, confirmed: true, at: '2026-10-22 10:00' }).result).toBe('started')
    expect(cell(cells, 5, 'Üye no')).toBe("'2026-0010") // the left member's 0009 is not given again
  })

  it('byWca finds the member of a verified WCA ID, and no one for a typed or pending one', () => {
    const cells = [
      HEADERS,
      row('Üye', 'ayse@example.com', { ...verified, Dil: 'en' }),
      row('Üye', 'ali@example.com', { 'WCA ID': '2020ALIO01' }),
      row('Onay bekliyor', 'bekle@example.com', { 'WCA ID': '2021BEKL01', 'WCA doğrulandı': STAMP }),
    ]
    const post = load(cells)
    expect(post('byWca', { wcaId: '2019TEME01' })).toEqual({ result: 'ok', email: 'ayse@example.com', locale: 'en' })
    expect(post('byWca', { wcaId: '2020ALIO01' })).toEqual({ result: 'none' })
    expect(post('byWca', { wcaId: '2021BEKL01' })).toEqual({ result: 'none' })
  })

  it('rankingMembers lists abroad members too, for the Yurt dışı list', () => {
    const cells = [HEADERS, row('Üye', 'a@example.com', { 'WCA ID': '2019AAAA01', 'WCA doğrulandı': STAMP, 'İl sıralaması': STAMP, Şehir: 'Yurt dışı' })]
    expect(load(cells)('rankingMembers', {})).toEqual({ result: 'ok', members: [{ wcaId: '2019AAAA01', il: 'Yurt dışı' }] })
  })
})
