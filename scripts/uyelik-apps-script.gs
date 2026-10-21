// scripts/uyelik-apps-script.gs: Speedcubing Türkiye's Üye ol endpoint, bound to the members spreadsheet (spec
// 2026-10-19 §4). The site's server posts JSON here with the shared secret; the browser never calls it. Setup: README,
// "Üyelik tablosu". Dates are Istanbul time written as text ("2026-10-19 14:05"); Türkiye is UTC+3 all year.
// The script runs with the rights of the super admin who deployed it, and anyone who can edit the spreadsheet can edit
// the script: @OnlyCurrentDoc keeps its access to this spreadsheet alone.
/** @OnlyCurrentDoc */
const SHEET = 'Üyeler'
const HEADERS = ['Başvuru tarihi', 'Durum', 'Ad', 'Soyad', 'E-posta', 'Doğum tarihi', 'Veli onayı', 'Şehir', 'WCA ID', 'Yarışmalara yardım', 'Dil', 'Onay tarihi', 'Onay kodu']
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i]))
const PENDING = 'Onay bekliyor'
const MEMBER = 'Üye'
const DAY_MS = 24 * 60 * 60 * 1000
const CONFIRM_DAYS = 7
// The newsletter tab (spec 2026-10-20 §B): a copy of the SES list, written again on each refresh
const SITE = 'https://speedcubingturkiye.org'
const NEWSLETTER = 'Bülten'
const NEWSLETTER_HEADERS = ['E-posta', 'Dil', 'Onay tarihi', 'Sil']

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return reply({ result: 'error', reason: 'json' })
  }
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET')
  if (!secret || body.secret !== secret) return reply({ result: 'error', reason: 'auth' })
  return withLock(() => {
    if (body.action === 'apply') return reply(apply(body))
    if (body.action === 'confirm') return reply(confirm(body))
    if (body.action === 'link') return reply(link(body))
    if (body.action === 'get') return reply(get(body))
    if (body.action === 'update') return reply(update(body))
    if (body.action === 'changeEmail') return reply(changeEmail(body))
    if (body.action === 'delete') return reply(remove(body))
    return reply({ result: 'error', reason: 'action' })
  })
}

/** Daily time-driven trigger: deletes applications not confirmed within 7 days. */
function cleanup() {
  withLock(() => {
    const sh = sheet()
    const all = rows(sh)
    const now = Date.now()
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i][COL['Durum']] === PENDING && now - stampMs(all[i][COL['Başvuru tarihi']]) > CONFIRM_DAYS * DAY_MS) sh.deleteRow(i + 2)
    }
  })
}

/** The spreadsheet's menu: the Secretary refreshes the newsletter tab from here. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bülten').addItem('Listeyi yenile', 'refreshNewsletter').addToUi()
}

/**
 * The menu item and a daily time-driven trigger: the site deletes the addresses ticked "Sil" from the newsletter and
 * sends back every confirmed subscriber, and the tab is written again. An address the site has not deleted yet (it
 * takes 40 a call) stays ticked for the next refresh. It takes the document lock, not the script lock doPost waits for,
 * so a slow refresh never holds up an application.
 */
function refreshNewsletter() {
  withLock(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const sh = ss.getSheetByName(NEWSLETTER) || ss.insertSheet(NEWSLETTER)
    const n = sh.getLastRow() - 1
    const ticked = n > 0 ? sh.getRange(2, 1, n, NEWSLETTER_HEADERS.length).getValues().filter((r) => r[3] === true).map((r) => String(r[0])) : []
    const res = UrlFetchApp.fetch(`${SITE}/api/bulten/liste`, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${PropertiesService.getScriptProperties().getProperty('SECRET')}` },
      payload: JSON.stringify({ sil: ticked }),
      muteHttpExceptions: true,
    })
    if (res.getResponseCode() !== 200) throw new Error(`Bülten listesi alınamadı (HTTP ${res.getResponseCode()})`)
    const stillTicked = new Set(ticked)
    const rows = JSON.parse(res.getContentText()).aboneler.map((s) => [text(s.eposta), s.dil.toUpperCase(), text(s.tarih), stillTicked.has(s.eposta)])
    sh.getRange(1, 1, sh.getMaxRows(), NEWSLETTER_HEADERS.length).clearDataValidations()
    sh.clearContents()
    sh.getRange(1, 1, 1, NEWSLETTER_HEADERS.length).setValues([NEWSLETTER_HEADERS])
    sh.setFrozenRows(1)
    if (rows.length === 0) return
    // insertCheckboxes sets every cell to false, so the boxes go in before the values
    sh.getRange(2, 4, rows.length, 1).insertCheckboxes()
    sh.getRange(2, 1, rows.length, NEWSLETTER_HEADERS.length).setValues(rows)
  }, LockService.getDocumentLock())
}

function apply(b) {
  const sh = sheet()
  const all = rows(sh)
  const email = String(b.email).toLowerCase()
  const i = all.findIndex((r) => r[COL['E-posta']].toLowerCase() === email)
  if (i >= 0) {
    if (all[i][COL['Durum']] !== PENDING) return { result: 'member' } // "Üye", or "Asıl Üye" typed by the Secretary
    if (stampMs(b.at) - stampMs(all[i][COL['Başvuru tarihi']]) < DAY_MS) return { result: 'recent' }
  }
  const row = [b.at, PENDING, b.firstName, b.lastName, email, b.birthDate, b.guardian ? 'Evet' : '', b.city, b.wcaId, b.helps ? 'Evet' : '', b.locale, '', b.token].map(text)
  if (i >= 0) sh.getRange(i + 2, 1, 1, HEADERS.length).setValues([row])
  else sh.appendRow(row)
  return { result: 'pending' }
}

function confirm(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = all.findIndex((r) => r[COL['Onay kodu']] === b.token)
  if (i < 0) return { result: 'invalid' }
  if (all[i][COL['Durum']] !== PENDING) return { result: 'ok' } // a second click on the same link
  if (stampMs(b.at) - stampMs(all[i][COL['Başvuru tarihi']]) > CONFIRM_DAYS * DAY_MS) return { result: 'invalid' }
  sh.getRange(i + 2, COL['Durum'] + 1).setValue(MEMBER)
  sh.getRange(i + 2, COL['Onay tarihi'] + 1).setValue(text(b.at))
  return { result: 'ok' }
}

// Hesabım (spec 2026-10-21): the site posts the address from a link it mailed, so every action trusts it

/** The member row of an address, or -1; an application still waiting for its link is not a member. */
function memberIndex(all, email) {
  const e = String(email).toLowerCase()
  return all.findIndex((r) => r[COL['E-posta']].toLowerCase() === e && r[COL['Durum']] !== PENDING)
}

/** Whether to mail a Hesabım link: only to a member, and at most once in 10 minutes per address. */
function link(b) {
  if (memberIndex(rows(sheet()), b.email) < 0) return { result: 'none' }
  const cache = CacheService.getScriptCache()
  const key = `hesap:${String(b.email).toLowerCase()}`
  if (cache.get(key)) return { result: 'none' }
  cache.put(key, '1', 600)
  return { result: 'ok' }
}

function get(b) {
  const all = rows(sheet())
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  const r = all[i]
  return {
    result: 'ok',
    member: {
      firstName: r[COL['Ad']],
      lastName: r[COL['Soyad']],
      email: r[COL['E-posta']],
      birthDate: r[COL['Doğum tarihi']],
      guardian: r[COL['Veli onayı']] === 'Evet',
      city: r[COL['Şehir']],
      wcaId: r[COL['WCA ID']],
      helps: r[COL['Yarışmalara yardım']] === 'Evet',
      locale: r[COL['Dil']] === 'en' ? 'en' : 'tr',
    },
  }
}

/** Ad to Yarışmalara yardım (C to J) in one write; the address stays as it is. */
function update(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  const values = [b.firstName, b.lastName, all[i][COL['E-posta']], b.birthDate, b.guardian ? 'Evet' : '', b.city, b.wcaId, b.helps ? 'Evet' : '']
  sh.getRange(i + 2, COL['Ad'] + 1, 1, values.length).setValues([values.map(text)])
  return { result: 'ok' }
}

/** 'taken' when any row, a pending application included, already has the new address. */
function changeEmail(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  const next = String(b.newEmail).toLowerCase()
  if (all.some((r) => r[COL['E-posta']].toLowerCase() === next)) return { result: 'taken' }
  sh.getRange(i + 2, COL['E-posta'] + 1).setValue(text(next))
  return { result: 'ok' }
}

/** Üyelikten ayrılma: the row goes at once. */
function remove(b) {
  const sh = sheet()
  const i = memberIndex(rows(sh), b.email)
  if (i < 0) return { result: 'none' }
  sh.deleteRow(i + 2)
  return { result: 'ok' }
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET)
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS)
  return sh
}

function rows(sh) {
  const n = sh.getLastRow() - 1
  return n > 0 ? sh.getRange(2, 1, n, HEADERS.length).getDisplayValues() : []
}

/** Written as text: a leading apostrophe keeps dates from being reparsed and a value starting with = + - @ from becoming a formula. */
function text(v) {
  const s = String(v)
  return s === '' ? '' : `'${s}`
}

function stampMs(s) {
  return Date.parse(`${String(s).replace(' ', 'T')}:00+03:00`)
}

function withLock(fn, lock = LockService.getScriptLock()) {
  lock.waitLock(20000)
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
