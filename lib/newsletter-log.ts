// lib/newsletter-log.ts: the ledger of manual newsletters (content/newsletter-log.json on main, spec §6.6). A send first
// writes its entry with the file's sha (a lock: a second run gets a conflict), then completes it with the counts.
import { readRepoFile, writeRepoFile } from '@/lib/github'
import type { SendReport } from '@/lib/newsletter'

export const LOG_PATH = 'content/newsletter-log.json'
/** At most one manual newsletter per day (spec §6.6). */
export const DAILY_GAP_MS = 24 * 3_600_000

export type LogEntry = { slug: string; startedAt: string; finishedAt?: string; sent?: { tr: number; en: number }; failed?: number }
export type NewsletterLog = { sent: LogEntry[] }

export function parseLog(text: string | undefined): NewsletterLog {
  if (!text) return { sent: [] }
  const v = JSON.parse(text) as { sent?: unknown }
  return { sent: Array.isArray(v.sent) ? (v.sent as LogEntry[]) : [] }
}

export const serializeLog = (log: NewsletterLog) => `${JSON.stringify(log, null, 2)}\n`

/** Why a news entry may not go out now: already sent (or started), or another newsletter started within 24 hours. */
export function blockReason(log: NewsletterLog, slug: string, now: number): 'sent' | 'daily_limit' | null {
  if (log.sent.some((e) => e.slug === slug)) return 'sent'
  if (log.sent.some((e) => now - Date.parse(e.startedAt) < DAILY_GAP_MS)) return 'daily_limit'
  return null
}

/** News marked "Bültenle gönder" that the log does not list, oldest first (the workflow sends the first one). */
export function pendingSlugs(entries: { slug: string; date: string; bulten: boolean; auto: boolean }[], log: NewsletterLog): string[] {
  const done = new Set(log.sent.map((e) => e.slug))
  return entries
    .filter((e) => e.bulten && !e.auto && !done.has(e.slug))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug))
    .map((e) => e.slug)
}

export type Claim = { ok: true } | { ok: false; reason: 'sent' | 'daily_limit' | 'conflict' | 'error' }

/** Writes the start entry; only one run can win it (spec §6.6 step 4.5). */
export async function claimNewsletter(slug: string, now = Date.now()): Promise<Claim> {
  const file = await readRepoFile(LOG_PATH)
  const log = parseLog(file?.text)
  const reason = blockReason(log, slug, now)
  if (reason) return { ok: false, reason }
  const next: NewsletterLog = { sent: [...log.sent, { slug, startedAt: new Date(now).toISOString() }] }
  const res = await writeRepoFile(LOG_PATH, serializeLog(next), `chore(newsletter): start ${slug}`, file?.sha ?? null)
  return res === 'ok' ? { ok: true } : { ok: false, reason: res }
}

/** Completes the entry with the counts; one retry when another commit landed in between. */
export async function finishNewsletter(slug: string, report: SendReport, now = Date.now()): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const file = await readRepoFile(LOG_PATH)
    const log = parseLog(file?.text)
    const sent = log.sent.map((e) => (e.slug === slug ? { ...e, finishedAt: new Date(now).toISOString(), sent: report.sent, failed: report.failed } : e))
    const res = await writeRepoFile(LOG_PATH, serializeLog({ sent }), `chore(newsletter): sent ${slug}`, file?.sha ?? null)
    if (res === 'ok') return true
    if (res === 'error') return false
  }
  return false
}
