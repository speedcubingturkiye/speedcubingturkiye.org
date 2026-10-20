'use server'

import { botCheck } from '@/lib/form-guard'
import { requestMembership, wcaIdExists } from '@/lib/membership'
import { parseApplication } from '@/lib/membership-rules'
import { sheetReady } from '@/lib/membership-sheet'
import { todayIstanbul } from '@/lib/wca/status'
import type { MembershipState } from '@/app/actions/types'

export async function applyForMembership(_prev: MembershipState, formData: FormData): Promise<MembershipState> {
  const guard = botCheck(formData)
  if (guard === 'bot') return { ok: true } // pretend success to the bot
  if (guard === 'too_fast') return { ok: false, error: 'too_fast' }
  if (!sheetReady()) return { ok: false, error: 'closed' }

  const parsed = parseApplication(formData, todayIstanbul())
  if (!parsed.ok) return { ok: false, error: parsed.error }
  if (parsed.data.wcaId && !(await wcaIdExists(parsed.data.wcaId))) return { ok: false, error: 'wcaId' }

  const locale = formData.get('locale') === 'en' ? 'en' : 'tr'
  return (await requestMembership(parsed.data, locale)) ? { ok: true } : { ok: false, error: 'send_failed' }
}
