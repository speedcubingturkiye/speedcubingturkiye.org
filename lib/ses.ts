// lib/ses.ts: Amazon SES in us-east-1 (spec §2, §5): sends every mail and keeps the newsletter list. The list
// "bulten" has one topic per language ("tr", "en", default OPT_OUT): a confirmed subscriber is opted in to the topic of
// their language, an unconfirmed contact to none. ListContacts returns no custom attributes, so the language lives in
// the topic. Every SES call except SendEmail is throttled at one request per second per account: the client retries.
import {
  CreateContactCommand,
  DeleteContactCommand,
  GetContactCommand,
  ListContactsCommand,
  SendEmailCommand,
  SESv2Client,
  UpdateContactCommand,
  type TopicPreference,
} from '@aws-sdk/client-sesv2'
import type { Locale } from '@/i18n/routing'
import { site } from '@/site.config'

export const REGION = 'us-east-1'
export const LIST = 'bulten'

export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string; headers?: Record<string, string> }
export type Subscriber = { status: 'pending' | 'confirmed'; locale: Locale | null; updatedAt: number }

let client: SESv2Client | undefined

/** The client, or null in development without keys (mails are logged instead). Throws in production without keys. */
function ses(): SESv2Client | null {
  const accessKeyId = process.env.SES_ACCESS_KEY_ID
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) {
    // Named, because every log line prints e.name: "SES SendEmail failed: SesKeysMissing", not "...: Error".
    if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('SES_ACCESS_KEY_ID / SES_SECRET_ACCESS_KEY missing'), { name: 'SesKeysMissing' })
    return null
  }
  return (client ??= new SESv2Client({ region: REGION, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 5 }))
}

const errorName = (e: unknown) => (e instanceof Error ? e.name : String(e))
const optedIn = (prefs: TopicPreference[] | undefined) => prefs?.find((p) => p.SubscriptionStatus === 'OPT_IN')

/** "Speedcubing Türkiye <news@…>" with the display name as an RFC 2047 encoded word (SES wants ASCII headers). */
export function fromHeader(name = site.name, address = site.mailFrom): string {
  const shown = /^[\x20-\x7e]*$/.test(name) ? `"${name.replace(/["\\]/g, '')}"` : `=?UTF-8?B?${Buffer.from(name, 'utf8').toString('base64')}?=`
  return `${shown} <${address}>`
}

/** true when SES accepted the mail (or, in development without keys, when it was logged); false otherwise, logged. */
export async function sendMail(mail: Mail): Promise<boolean> {
  try {
    const c = ses()
    if (!c) {
      console.log('[ses:dev] mail', JSON.stringify({ ...mail, html: mail.html ? `${mail.html.length} characters` : undefined }, null, 2))
      return true
    }
    await c.send(
      new SendEmailCommand({
        FromEmailAddress: fromHeader(),
        Destination: { ToAddresses: [mail.to] },
        ...(mail.replyTo ? { ReplyToAddresses: [mail.replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: mail.text, Charset: 'UTF-8' },
              ...(mail.html ? { Html: { Data: mail.html, Charset: 'UTF-8' } } : {}),
            },
            ...(mail.headers ? { Headers: Object.entries(mail.headers).map(([Name, Value]) => ({ Name, Value })) } : {}),
          },
        },
      }),
    )
    return true
  } catch (e) {
    console.error('SES SendEmail failed:', errorName(e))
    return false
  }
}

/** null when the address is not on the list (and in development without keys). */
export async function getSubscriber(email: string): Promise<Subscriber | null> {
  const c = ses()
  if (!c) return null
  try {
    const r = await c.send(new GetContactCommand({ ContactListName: LIST, EmailAddress: email }))
    const topic = optedIn(r.TopicPreferences)?.TopicName
    return {
      status: topic ? 'confirmed' : 'pending',
      locale: topic === 'tr' || topic === 'en' ? topic : null,
      updatedAt: r.LastUpdatedTimestamp?.getTime() ?? 0,
    }
  } catch (e) {
    if (errorName(e) === 'NotFoundException') return null
    throw e
  }
}

/** An unconfirmed contact (no topic opted in). Updating an existing one refreshes its LastUpdatedTimestamp, which the
 *  24-hour and 7-day rules read. Never call it with exists=true for a confirmed contact: the update drops its opt-in.
 *  With exists=false an existing contact rejects with AlreadyExistsException; the sign-up flood guard
 *  (requestSubscription) relies on that, so it must propagate. */
export async function putPending(email: string, locale: Locale, exists: boolean, now = Date.now()): Promise<void> {
  const c = ses()
  if (!c) return console.log('[ses:dev] pending contact', locale)
  const input = { ContactListName: LIST, EmailAddress: email, AttributesData: JSON.stringify({ locale, sentAt: new Date(now).toISOString() }) }
  await c.send(exists ? new UpdateContactCommand(input) : new CreateContactCommand(input))
}

/** Opts the contact in to its language's topic and keeps the double opt-in record (spec §5): when the confirmation mail
 *  was requested, when the link was used and from which IP. UpdateContact replaces the attributes, so `sentAt`, which
 *  putPending stored, is written again. */
export async function confirmSubscriber(
  email: string,
  locale: Locale,
  record: { sentAt: string; confirmedAt: string; ip: string | null },
): Promise<void> {
  const c = ses()
  if (!c) return console.log('[ses:dev] confirmed contact', locale)
  await c.send(
    new UpdateContactCommand({
      ContactListName: LIST,
      EmailAddress: email,
      TopicPreferences: [{ TopicName: locale, SubscriptionStatus: 'OPT_IN' }],
      AttributesData: JSON.stringify({ locale, ...record }),
    }),
  )
}

/** Deletes the contact; an address that is not on the list is fine. */
export async function removeSubscriber(email: string): Promise<void> {
  const c = ses()
  if (!c) return console.log('[ses:dev] removed contact')
  try {
    await c.send(new DeleteContactCommand({ ContactListName: LIST, EmailAddress: email }))
  } catch (e) {
    if (errorName(e) !== 'NotFoundException') throw e
  }
}

/** Every confirmed subscriber of one language, 1,000 per call. */
export async function* listSubscribers(locale: Locale): AsyncGenerator<string> {
  const c = ses()
  if (!c) return
  let NextToken: string | undefined
  do {
    const r = await c.send(
      new ListContactsCommand({
        ContactListName: LIST,
        Filter: { FilteredStatus: 'OPT_IN', TopicFilter: { TopicName: locale, UseDefaultIfPreferenceUnavailable: false } },
        PageSize: 1000,
        NextToken,
      }),
    )
    for (const contact of r.Contacts ?? []) if (contact.EmailAddress) yield contact.EmailAddress
    NextToken = r.NextToken
  } while (NextToken)
}

/** Unconfirmed contacts last written before `before` (epoch ms). */
export async function* listStalePending(before: number): AsyncGenerator<string> {
  const c = ses()
  if (!c) return
  let NextToken: string | undefined
  do {
    const r = await c.send(new ListContactsCommand({ ContactListName: LIST, PageSize: 1000, NextToken }))
    for (const contact of r.Contacts ?? []) {
      const updated = contact.LastUpdatedTimestamp?.getTime() ?? 0
      if (contact.EmailAddress && !optedIn(contact.TopicPreferences) && updated < before) yield contact.EmailAddress
    }
    NextToken = r.NextToken
  } while (NextToken)
}
