// scripts/uyelik-apps-script.gs: Speedcubing Türkiye's Üye ol endpoint, bound to the members spreadsheet (spec
// 2026-10-19 §4). The site's server posts JSON here with the shared secret; the browser never calls it. Setup: README,
// "Üyelik tablosu". Dates are Istanbul time written as text ("2026-10-19 14:05"); Türkiye is UTC+3 all year.
// The script runs with the rights of the super admin who deployed it, and anyone who can edit the spreadsheet can edit
// the script: @OnlyCurrentDoc keeps its access to this spreadsheet alone.
/** @OnlyCurrentDoc */
const SHEET = 'Üyeler'
const HEADERS = ['Başvuru tarihi', 'Durum', 'Ad', 'Soyad', 'E-posta', 'Doğum tarihi', 'Veli onayı', 'Şehir', 'WCA ID', 'Yarışmalara yardım', 'Dil', 'Onay tarihi', 'Onay kodu', 'WCA doğrulandı', 'İl sıralaması', 'İl tarihi', 'Üye no', 'Telefon', 'Sohbet grupları']
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i]))
const PENDING = 'Onay bekliyor'
const MEMBER = 'Üye'
const DAY_MS = 24 * 60 * 60 * 1000
const CONFIRM_DAYS = 7
const LOCK_DAYS = 365
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
  const action = ACTIONS[body.action]
  if (!action) return reply({ result: 'error', reason: 'action' })
  return withLock(() => {
    // Üye no: before, for the members from before the column (so get reads theirs); after, for one this call began
    numberMembers(sheet())
    const out = action(body)
    numberMembers(sheet())
    return reply(out)
  })
}

const ACTIONS = {
  apply: (b) => apply(b),
  confirm: (b) => confirm(b),
  link: (b) => link(b),
  get: (b) => get(b),
  update: (b) => update(b),
  changeEmail: (b) => changeEmail(b),
  emailGate: (b) => emailGate(b),
  delete: (b) => remove(b),
  linkWca: (b) => linkWca(b),
  unlinkWca: (b) => unlinkWca(b),
  byWca: (b) => byWca(b),
  ranking: (b) => ranking(b),
  rankingMembers: () => rankingMembers(),
}

/**
 * One mailbox, one address (2026-10-22): lower case, no "+tag", and for Gmail no dots and gmail.com for googlemail.com,
 * so kutay.temel@gmail.com, KutayTemel+x@googlemail.com and kutaytemel@gmail.com are one member. The site sends this
 * form already (lib/email.ts, the same rule); rows written before it are compared through it too.
 */
function canon(email) {
  const s = String(email).trim().toLowerCase()
  const at = s.lastIndexOf('@')
  if (at < 1) return s
  const domain = s.slice(at + 1) === 'googlemail.com' ? 'gmail.com' : s.slice(at + 1)
  const local = s.slice(0, at).split('+')[0]
  return `${domain === 'gmail.com' ? local.replace(/\./g, '') : local}@${domain}`
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

/**
 * An application. WCA ile kaydol (spec 2026-10-21) adds `wcaVerified` (the WCA ID came from a WCA login), `ranking` and
 * `confirmed` (the WCA login proved the address): such an application starts a member row at once, or links the WCA ID
 * to the member the address already is. A WCA ID another member verified belongs to that membership.
 */
function apply(b) {
  const sh = sheet()
  const all = rows(sh)
  const email = canon(b.email)
  if (b.wcaVerified && verifiedElsewhere(all, email, b.wcaId)) return { result: 'taken' }
  const i = all.findIndex((r) => canon(r[COL['E-posta']]) === email)
  if (i >= 0 && all[i][COL['Durum']] !== PENDING) {
    // "Üye", or "Asıl Üye" typed by the Secretary: the rest of the row stays
    if (!b.confirmed || !b.wcaVerified) return { result: 'member' }
    linkWca(b)
    if (b.ranking) ranking({ email, join: true, at: b.at })
    return { result: 'linked' }
  }
  if (i >= 0 && !b.confirmed && stampMs(b.at) - stampMs(all[i][COL['Başvuru tarihi']]) < DAY_MS) return { result: 'recent' }
  // Abroad joins too (2026-10-22): the rankings have a Yurt dışı list
  const joins = Boolean(b.ranking && b.wcaVerified)
  const when = (yes) => (yes ? b.at : '')
  // Üye no stays empty here: numberMembers gives it once the membership begins. Telefon (2026-10-24): the Secretary
  // adds every member to the WhatsApp community with it; Sohbet grupları: when the box for the chat groups was ticked.
  const row = [b.at, b.confirmed ? MEMBER : PENDING, b.firstName, b.lastName, email, b.birthDate, b.guardian ? 'Evet' : '', b.city, b.wcaId, b.helps ? 'Evet' : '', b.locale, when(b.confirmed), b.token, when(b.wcaVerified), when(joins), when(joins), '', b.phone || '', when(b.chat)].map(text)
  if (i >= 0) sh.getRange(i + 2, 1, 1, HEADERS.length).setValues([row])
  else sh.appendRow(row)
  return { result: b.confirmed ? 'started' : 'pending' }
}

/** The confirm link. A WCA ID another member verified in the meantime (two addresses, one WCA login) stays with that
 *  membership: this one begins without it, and the answer says so (wca: 'taken'). */
function confirm(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = all.findIndex((r) => r[COL['Onay kodu']] === b.token)
  if (i < 0) return { result: 'invalid' }
  const r = all[i]
  if (r[COL['Durum']] !== PENDING) return { result: 'ok' } // a second click on the same link
  if (stampMs(b.at) - stampMs(r[COL['Başvuru tarihi']]) > CONFIRM_DAYS * DAY_MS) return { result: 'invalid' }
  sh.getRange(i + 2, COL['Durum'] + 1).setValue(MEMBER)
  sh.getRange(i + 2, COL['Onay tarihi'] + 1).setValue(text(b.at))
  const taken = marked(r, 'WCA doğrulandı') && verifiedElsewhere(all, canon(r[COL['E-posta']]), r[COL['WCA ID']])
  if (!taken) return { result: 'ok' }
  mark(sh, i, { 'WCA ID': '', 'WCA doğrulandı': '', 'İl sıralaması': '', 'İl tarihi': '' })
  return { result: 'ok', wca: 'taken' }
}

// Hesabım (spec 2026-10-21): the site posts the address from a link it mailed, so every action trusts it

/** The member row of an address (any way of writing its mailbox), or -1; an application still waiting for its link is
 *  not a member. */
function memberIndex(all, email) {
  const e = canon(email)
  return all.findIndex((r) => canon(r[COL['E-posta']]) === e && r[COL['Durum']] !== PENDING)
}

/** Whether to mail a Hesabım link: only to a member, and at most once in 10 minutes per mailbox. */
function link(b) {
  if (memberIndex(rows(sheet()), b.email) < 0) return { result: 'none' }
  return once(`hesap:${canon(b.email)}`) ? { result: 'ok' } : { result: 'none' }
}

/** Whether to mail an E-posta değiştirme link (2026-10-22): only for a member, and at most once in 10 minutes per new
 *  mailbox, so a member cannot flood someone else's inbox with it. */
function emailGate(b) {
  if (memberIndex(rows(sheet()), b.email) < 0) return { result: 'none' }
  return once(`eposta:${canon(b.newEmail)}`) ? { result: 'ok' } : { result: 'wait' }
}

/** True the first time in 10 minutes for this key, false after. */
function once(key) {
  const cache = CacheService.getScriptCache()
  if (cache.get(key)) return false
  cache.put(key, '1', 600)
  return true
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
      wcaVerified: marked(r, 'WCA doğrulandı'),
      ranking: marked(r, 'İl sıralaması'),
      cityLockedUntil: lockedUntil(r, Date.now()),
      memberNo: r[COL['Üye no']],
      phone: r[COL['Telefon']],
      chat: marked(r, 'Sohbet grupları'),
    },
  }
}

/** Ad to Yarışmalara yardım (C to J) in one write; the address stays as it is. A new city waits for the il ranking's
 *  lock; a changed verified WCA ID loses its mark and the ranking; a move inside the ranking starts a new lock, a move
 *  abroad too (Yurt dışı is a list of its own since 2026-10-22). */
function update(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  const r = all[i]
  const moved = b.city !== r[COL['Şehir']]
  if (moved && lockedUntil(r, stampMs(b.at))) return { result: 'locked' }
  // The address and the WCA ID stay: the WCA ID comes only from a WCA login
  const values = [b.firstName, b.lastName, r[COL['E-posta']], b.birthDate, b.guardian ? 'Evet' : '', b.city, r[COL['WCA ID']], b.helps ? 'Evet' : '']
  sh.getRange(i + 2, COL['Ad'] + 1, 1, values.length).setValues([values.map(text)])
  if (moved && marked(r, 'İl sıralaması')) mark(sh, i, { 'İl tarihi': b.at })
  // Telefon and Sohbet grupları (2026-10-24): the chat groups keep the stamp of their first yes. A site older than them
  // sends no phone and leaves both alone.
  if (typeof b.phone === 'string') mark(sh, i, { Telefon: b.phone, 'Sohbet grupları': b.chat ? r[COL['Sohbet grupları']] || b.at : '' })
  return { result: 'ok' }
}

/** 'taken' when any row, a pending application included, already has the new mailbox, written any way. */
function changeEmail(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  const next = canon(b.newEmail)
  if (all.some((r) => canon(r[COL['E-posta']]) === next)) return { result: 'taken' }
  sh.getRange(i + 2, COL['E-posta'] + 1).setValue(text(next))
  return { result: 'ok' }
}

/**
 * Üyelikten ayrılma: the row goes at once, and its İl tarihi with it, so a member who leaves and signs up again starts a
 * new 365-day city lock. Deferred on purpose (2026-10-22, the user's call): keeping the lock would mean keeping a former
 * member's WCA ID, province and date (an "İl kilitleri" tab, at most 365 days, with a line in the privacy notice). Add
 * it if someone is seen leaving and coming back to change province; leaving costs the Üye no and the start date anyway.
 */
function remove(b) {
  const sh = sheet()
  const i = memberIndex(rows(sh), b.email)
  if (i < 0) return { result: 'none' }
  sh.deleteRow(i + 2)
  return { result: 'ok' }
}

// WCA bağlama and il sıralaması (spec 2026-10-21, Parça 2). N and O hold the Istanbul stamps of the verification and
// of the consent, P the stamp the city lock started. Any value counts as set, so the Secretary may type in them too.

const marked = (r, h) => Boolean(r[COL[h]])

/** The Istanbul date the city lock ends, or '' when none runs at `nowMs`; an unreadable İl tarihi locks nothing. */
function lockedUntil(r, nowMs) {
  const since = r[COL['İl tarihi']]
  const end = since ? stampMs(since) + LOCK_DAYS * DAY_MS : 0
  return nowMs < end ? new Date(end + 3 * 3600000).toISOString().slice(0, 10) : ''
}

/** Writes the given columns of member row i as text ('' clears). */
function mark(sh, i, changes) {
  Object.entries(changes).forEach(([h, v]) => sh.getRange(i + 2, COL[h] + 1).setValue(text(v)))
}

/** WCA bağlama: the WCA ID the WCA login returned, unless another member verified it first. */
function linkWca(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  if (verifiedElsewhere(all, canon(b.email), b.wcaId)) return { result: 'taken' }
  const changes = { 'WCA ID': b.wcaId, 'WCA doğrulandı': b.at }
  if (b.wcaId !== all[i][COL['WCA ID']]) changes['İl sıralaması'] = '' // the consent named the old ID's results
  mark(sh, i, changes)
  return { result: 'ok' }
}

/** The link goes with the WCA ID it brought, the ranking with it; the city lock stays. */
function unlinkWca(b) {
  const sh = sheet()
  const i = memberIndex(rows(sh), b.email)
  if (i < 0) return { result: 'none' }
  mark(sh, i, { 'WCA ID': '', 'WCA doğrulandı': '', 'İl sıralaması': '' })
  return { result: 'ok' }
}

/** Another mailbox's member row with this WCA ID verified (`email` in canon form); a row still waiting for its link does
 *  not count. */
function verifiedElsewhere(all, email, wcaId) {
  return all.some((r) => canon(r[COL['E-posta']]) !== email && r[COL['Durum']] !== PENDING && r[COL['WCA ID']] === wcaId && marked(r, 'WCA doğrulandı'))
}

/** WCA ile giriş (2026-10-22): the member whose verified WCA ID the WCA login returned, for the site to mint a Hesabım
 *  link for; a WCA ID typed in by the Secretary, unverified, opens nothing. */
function byWca(b) {
  const r = rows(sheet()).find((x) => x[COL['Durum']] !== PENDING && x[COL['WCA ID']] === b.wcaId && marked(x, 'WCA doğrulandı'))
  return r ? { result: 'ok', email: r[COL['E-posta']], locale: r[COL['Dil']] === 'en' ? 'en' : 'tr' } : { result: 'none' }
}

/** İl sıralaması in or out. In needs a verified WCA ID (abroad counts as a place since 2026-10-22); the city lock starts
 *  unless one runs. */
function ranking(b) {
  const sh = sheet()
  const all = rows(sh)
  const i = memberIndex(all, b.email)
  if (i < 0) return { result: 'none' }
  if (!b.join) {
    mark(sh, i, { 'İl sıralaması': '' })
    return { result: 'ok' }
  }
  const r = all[i]
  if (!marked(r, 'WCA doğrulandı')) return { result: 'not_allowed' }
  mark(sh, i, lockedUntil(r, stampMs(b.at)) ? { 'İl sıralaması': b.at } : { 'İl sıralaması': b.at, 'İl tarihi': b.at })
  return { result: 'ok' }
}

/** The rankings pages' list: verified members in the il ranking, with their province (or Yurt dışı). */
function rankingMembers() {
  const members = rows(sheet())
    .filter((r) => r[COL['Durum']] !== PENDING && marked(r, 'WCA doğrulandı') && marked(r, 'İl sıralaması') && r[COL['WCA ID']])
    .map((r) => ({ wcaId: r[COL['WCA ID']], il: r[COL['Şehir']] }))
  return { result: 'ok', members }
}

/**
 * Üye no (2026-10-22): every member row without one gets the next number of the year its membership began (Onay tarihi,
 * else Başvuru tarihi), as YYYY-NNNN, in the order the memberships began. The counters live in the script's properties,
 * under the lock, so a number is never given twice, not even after its member leaves. The Secretary may type one in.
 */
function numberMembers(sh) {
  const since = (r) => r[COL['Onay tarihi']] || r[COL['Başvuru tarihi']]
  const missing = rows(sh)
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r[COL['Durum']] !== PENDING && !r[COL['Üye no']])
    .sort((a, b) => (stampMs(since(a.r)) || 0) - (stampMs(since(b.r)) || 0) || a.i - b.i)
  if (missing.length === 0) return
  const props = PropertiesService.getScriptProperties()
  for (const { r, i } of missing) {
    const year = /^\d{4}/.test(since(r)) ? since(r).slice(0, 4) : new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 4)
    const n = Number(props.getProperty(`uyeNo:${year}`) || 0) + 1
    props.setProperty(`uyeNo:${year}`, String(n))
    sh.getRange(i + 2, COL['Üye no'] + 1).setValue(text(`${year}-${String(n).padStart(4, '0')}`))
  }
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET)
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS)
  else {
    // Columns added later (N to P, spec 2026-10-21; Q, Üye no, 2026-10-22; R and S, Telefon and Sohbet grupları,
    // 2026-10-24) get their headers on the first call after an update. R and right were free for notes until then: a
    // note column in R or S stops every call, rather than its notes being read and overwritten as phone numbers.
    const added = HEADERS.slice(COL['WCA doğrulandı'])
    const range = sh.getRange(1, COL['WCA doğrulandı'] + 1, 1, added.length)
    const head = range.getDisplayValues()[0]
    if (head.some((v, j) => v !== '' && v !== added[j] && COL[added[j]] >= COL['Telefon'])) {
      throw new Error('Üyeler: R ve S sütunları artık Telefon ve Sohbet grupları için. Oradaki notları sağdaki boş bir sütuna taşıyın.')
    }
    if (head[head.length - 1] === '') range.setValues([added])
  }
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
