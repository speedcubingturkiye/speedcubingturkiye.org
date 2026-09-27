// lib/ses.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmSubscriber, fromHeader, getSubscriber, listStalePending, listSubscribers, putPending, removeSubscriber, sendMail } from '@/lib/ses'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))

// Each command keeps its input so the tests can read what lib/ses.ts asked SES for.
vi.mock('@aws-sdk/client-sesv2', () => {
  class Command {
    input: Record<string, unknown>
    constructor(input: Record<string, unknown>) {
      this.input = input
    }
  }
  return {
    SESv2Client: class {
      send = send
    },
    SendEmailCommand: class SendEmailCommand extends Command {},
    GetContactCommand: class GetContactCommand extends Command {},
    CreateContactCommand: class CreateContactCommand extends Command {},
    UpdateContactCommand: class UpdateContactCommand extends Command {},
    DeleteContactCommand: class DeleteContactCommand extends Command {},
    ListContactsCommand: class ListContactsCommand extends Command {},
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the assertions read the mocked command's input as deep as they need
type Sent = { constructor: { name: string }; input: Record<string, any> }
const call = (i: number) => send.mock.calls[i][0] as Sent
const named = (name: string) => Object.assign(new Error(name), { name })
const collect = async (gen: AsyncGenerator<string>) => {
  const out: string[] = []
  for await (const x of gen) out.push(x)
  return out
}

describe('fromHeader', () => {
  it('encodes a non-ASCII display name as an RFC 2047 word and quotes an ASCII one', () => {
    const word = Buffer.from('Speedcubing Türkiye', 'utf8').toString('base64')
    expect(fromHeader('Speedcubing Türkiye', 'news@x.org')).toBe(`=?UTF-8?B?${word}?= <news@x.org>`)
    expect(fromHeader('Plain Name', 'news@x.org')).toBe('"Plain Name" <news@x.org>')
  })
})

describe('with keys', () => {
  beforeEach(() => {
    send.mockReset()
    vi.stubEnv('SES_ACCESS_KEY_ID', 'test-key-id')
    vi.stubEnv('SES_SECRET_ACCESS_KEY', 'test-secret')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sendMail sends UTF-8 text and HTML with Reply-To and headers', async () => {
    send.mockResolvedValue({})
    const ok = await sendMail({ to: 'a@b.com', subject: 'Yeni yarışma', text: 't', html: '<p>h</p>', replyTo: 'info@x.org', headers: { 'List-Unsubscribe': '<https://x/u>' } })
    expect(ok).toBe(true)
    const c = call(0)
    expect(c.constructor.name).toBe('SendEmailCommand')
    expect(c.input.FromEmailAddress).toMatch(/^=\?UTF-8\?B\?.+\?= <news@speedcubingturkiye\.org>$/)
    expect(c.input.Destination).toEqual({ ToAddresses: ['a@b.com'] })
    expect(c.input.ReplyToAddresses).toEqual(['info@x.org'])
    expect(c.input.Content.Simple.Subject).toEqual({ Data: 'Yeni yarışma', Charset: 'UTF-8' })
    expect(c.input.Content.Simple.Body).toEqual({ Text: { Data: 't', Charset: 'UTF-8' }, Html: { Data: '<p>h</p>', Charset: 'UTF-8' } })
    expect(c.input.Content.Simple.Headers).toEqual([{ Name: 'List-Unsubscribe', Value: '<https://x/u>' }])
  })

  it('sendMail resolves false (and logs the error name) when SES refuses', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockRejectedValue(named('MessageRejected'))
    expect(await sendMail({ to: 'a@b.com', subject: 's', text: 't' })).toBe(false)
    expect(error).toHaveBeenCalledWith('SES SendEmail failed:', 'MessageRejected')
  })

  it('getSubscriber reads the opted-in topic as the language', async () => {
    send.mockResolvedValueOnce({ TopicPreferences: [{ TopicName: 'en', SubscriptionStatus: 'OPT_IN' }], LastUpdatedTimestamp: new Date(5000) })
    expect(await getSubscriber('a@b.com')).toEqual({ status: 'confirmed', locale: 'en', updatedAt: 5000 })
    expect(call(0).input).toEqual({ ContactListName: 'bulten', EmailAddress: 'a@b.com' })
    send.mockResolvedValueOnce({ TopicPreferences: [], LastUpdatedTimestamp: new Date(7000) })
    expect(await getSubscriber('a@b.com')).toEqual({ status: 'pending', locale: null, updatedAt: 7000 })
  })

  it('getSubscriber returns null for an address that is not on the list and rethrows anything else', async () => {
    send.mockRejectedValueOnce(named('NotFoundException'))
    expect(await getSubscriber('a@b.com')).toBeNull()
    send.mockRejectedValueOnce(named('TooManyRequestsException'))
    await expect(getSubscriber('a@b.com')).rejects.toThrow('TooManyRequestsException')
  })

  it('putPending creates a new contact and updates an existing one, with the language and the send time', async () => {
    send.mockResolvedValue({})
    await putPending('a@b.com', 'tr', false, Date.UTC(2026, 8, 29))
    expect(call(0).constructor.name).toBe('CreateContactCommand')
    expect(call(0).input).toEqual({ ContactListName: 'bulten', EmailAddress: 'a@b.com', AttributesData: JSON.stringify({ locale: 'tr', sentAt: '2026-09-29T00:00:00.000Z' }) })
    await putPending('a@b.com', 'tr', true)
    expect(call(1).constructor.name).toBe('UpdateContactCommand')
  })

  it('putPending lets AlreadyExistsException through: the sign-up flood guard relies on it', async () => {
    send.mockRejectedValueOnce(named('AlreadyExistsException'))
    await expect(putPending('a@b.com', 'tr', false)).rejects.toMatchObject({ name: 'AlreadyExistsException' })
  })

  it('confirmSubscriber opts in to the language topic and keeps the double opt-in record with the request time', async () => {
    send.mockResolvedValue({})
    await confirmSubscriber('a@b.com', 'en', { sentAt: '2026-09-29T09:59:00.000Z', confirmedAt: '2026-09-29T10:00:00.000Z', ip: '203.0.113.7' })
    expect(call(0).constructor.name).toBe('UpdateContactCommand')
    expect(call(0).input).toEqual({
      ContactListName: 'bulten',
      EmailAddress: 'a@b.com',
      TopicPreferences: [{ TopicName: 'en', SubscriptionStatus: 'OPT_IN' }],
      // UpdateContact replaces the attributes, so the request time the pending write stored must be written again.
      AttributesData: JSON.stringify({ locale: 'en', sentAt: '2026-09-29T09:59:00.000Z', confirmedAt: '2026-09-29T10:00:00.000Z', ip: '203.0.113.7' }),
    })
  })

  it('removeSubscriber deletes and ignores an address that is already gone', async () => {
    send.mockResolvedValueOnce({})
    await removeSubscriber('a@b.com')
    expect(call(0).constructor.name).toBe('DeleteContactCommand')
    send.mockRejectedValueOnce(named('NotFoundException'))
    await expect(removeSubscriber('a@b.com')).resolves.toBeUndefined()
  })

  it('listSubscribers pages through the opted-in contacts of one topic', async () => {
    send
      .mockResolvedValueOnce({ Contacts: [{ EmailAddress: 'a@b.com' }, { EmailAddress: 'c@d.com' }], NextToken: 'next' })
      .mockResolvedValueOnce({ Contacts: [{ EmailAddress: 'e@f.com' }] })
    expect(await collect(listSubscribers('en'))).toEqual(['a@b.com', 'c@d.com', 'e@f.com'])
    expect(call(0).input).toEqual({
      ContactListName: 'bulten',
      Filter: { FilteredStatus: 'OPT_IN', TopicFilter: { TopicName: 'en', UseDefaultIfPreferenceUnavailable: false } },
      PageSize: 1000,
      NextToken: undefined,
    })
    expect(call(1).input.NextToken).toBe('next')
  })

  it('listStalePending yields unconfirmed contacts last written before the cutoff', async () => {
    send.mockResolvedValueOnce({
      Contacts: [
        { EmailAddress: 'old@x.com', TopicPreferences: [], LastUpdatedTimestamp: new Date(1000) },
        { EmailAddress: 'new@x.com', TopicPreferences: [], LastUpdatedTimestamp: new Date(9000) },
        { EmailAddress: 'sub@x.com', TopicPreferences: [{ TopicName: 'tr', SubscriptionStatus: 'OPT_IN' }], LastUpdatedTimestamp: new Date(1000) },
      ],
    })
    expect(await collect(listStalePending(5000))).toEqual(['old@x.com'])
  })
})

describe('without keys', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('production: sendMail resolves false instead of throwing (Preview has no keys) and the log names the missing keys', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SES_ACCESS_KEY_ID', '')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await sendMail({ to: 'a@b.com', subject: 's', text: 't' })).toBe(false)
    expect(error).toHaveBeenCalledWith('SES SendEmail failed:', 'SesKeysMissing')
  })

  it('development: sendMail logs the mail and resolves true; the list reads as empty', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SES_ACCESS_KEY_ID', '')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await sendMail({ to: 'a@b.com', subject: 's', text: 'confirm: https://x/onay?t=1' })).toBe(true)
    expect(String(log.mock.calls[0][1])).toContain('https://x/onay?t=1')
    expect(await getSubscriber('a@b.com')).toBeNull()
    expect(await collect(listSubscribers('tr'))).toEqual([])
  })
})
