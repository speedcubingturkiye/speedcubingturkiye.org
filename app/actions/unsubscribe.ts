// app/actions/unsubscribe.ts
'use server'

import { cancelSubscription } from '@/lib/newsletter'

export type UnsubscribeState = { status: 'idle' | 'done' | 'failed' }

/** The button on /bulten/cikis (spec §6.4): the token in the form names the address. */
export async function unsubscribeAction(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  return { status: (await cancelSubscription(String(formData.get('t') ?? ''))) ? 'done' : 'failed' }
}
