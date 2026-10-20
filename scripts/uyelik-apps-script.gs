// scripts/uyelik-apps-script.gs: Speedcubing Türkiye's Üye ol endpoint, bound to the members spreadsheet (spec
// 2026-10-19 §4). The site's server posts JSON here with the shared secret; the browser never calls it. Setup: README,
// "Üyelik tablosu". Dates are Istanbul time written as text ("2026-10-19 14:05"); Türkiye is UTC+3 all year.
const SHEET = 'Üyeler'
const HEADERS = ['Başvuru tarihi', 'Durum', 'Ad', 'Soyad', 'E-posta', 'Doğum tarihi', 'Veli onayı', 'Şehir', 'WCA ID', 'Yarışmalara yardım', 'Dil', 'Onay tarihi', 'Onay kodu']
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i]))
const PENDING = 'Onay bekliyor'
const MEMBER = 'Üye'
const DAY_MS = 24 * 60 * 60 * 1000
const CONFIRM_DAYS = 7

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

function withLock(fn) {
  const lock = LockService.getScriptLock()
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
