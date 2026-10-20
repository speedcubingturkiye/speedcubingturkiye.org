// lib/newsletter-sheet.ts: the Secretary's newsletter tab (spec 2026-10-20 §B), the members sheet's copy of the SES
// list. The sheet's script posts the addresses ticked "Sil" to /api/bulten/liste and writes back what this returns.
import { EMAIL_RE } from '@/app/actions/types'
import type { Locale } from '@/i18n/routing'
import { istanbulStamp } from '@/lib/membership'
import { listConfirmed, removeSubscriber } from '@/lib/ses'

/** Most addresses one refresh deletes: SES takes one contact call a second and Apps Script waits about a minute for the
 *  answer. The rest stay ticked in the sheet for the next refresh. */
export const SHEET_DELETE_MAX = 40

export type SheetSubscriber = { eposta: string; dil: Locale; tarih: string }

/** Deletes the ticked addresses (well-formed ones, at most SHEET_DELETE_MAX), then returns every confirmed subscriber,
 *  newest first, with the confirmation time in Istanbul time. */
export async function refreshForSheet(sil: unknown): Promise<SheetSubscriber[]> {
  const ticked = (Array.isArray(sil) ? sil : []).filter((e): e is string => typeof e === 'string' && EMAIL_RE.test(e))
  for (const email of ticked.slice(0, SHEET_DELETE_MAX)) await removeSubscriber(email)
  const subscribers = []
  for await (const s of listConfirmed()) subscribers.push(s)
  return subscribers
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((s) => ({ eposta: s.email, dil: s.locale, tarih: istanbulStamp(new Date(s.updatedAt)) }))
}
