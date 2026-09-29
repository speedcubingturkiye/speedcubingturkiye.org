// lib/contact-subject.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendContact } from '@/app/actions/contact'
import { CONTACT_SUBJECTS } from '@/app/actions/types'
import { contactSubjectLine, TITLE_MAX } from '@/lib/contact-subject'
import { sendMail } from '@/lib/ses'
import { site } from '@/site.config'
import tr from '@/messages/tr.json'
import en from '@/messages/en.json'

vi.mock('@/lib/ses', () => ({ sendMail: vi.fn() }))

describe('contactSubjectLine', () => {
  it('reads "Speedcubing Türkiye: <label>", the label the select shows in the form language', () => {
    expect(contactSubjectLine('genel', '', 'tr')).toEqual({ label: 'Genel', title: '', line: 'Speedcubing Türkiye: Genel' })
    expect(contactSubjectLine('genel', '', 'en')).toEqual({ label: 'General', title: '', line: 'Speedcubing Türkiye: General' })
    for (const s of CONTACT_SUBJECTS) {
      expect(contactSubjectLine(s, '', 'tr')?.line).toBe(`${site.name}: ${tr.forms.subjects[s]}`)
      expect(contactSubjectLine(s, '', 'en')?.line).toBe(`${site.name}: ${en.forms.subjects[s]}`)
    }
  })

  it('"Diğer" is the last subject', () => {
    expect(CONTACT_SUBJECTS.at(-1)).toBe('diger')
    expect(contactSubjectLine('diger', '', 'tr')?.label).toBe('Diğer')
    expect(contactSubjectLine('diger', '', 'en')?.label).toBe('Other')
  })

  it('"Diğer" without a title, or with a blank one, uses the label of "Diğer"', () => {
    expect(contactSubjectLine('diger', '', 'tr')?.line).toBe('Speedcubing Türkiye: Diğer')
    expect(contactSubjectLine('diger', ' \t ', 'tr')).toEqual({ label: 'Diğer', title: '', line: 'Speedcubing Türkiye: Diğer' })
    expect(contactSubjectLine('diger', '', 'en')?.line).toBe('Speedcubing Türkiye: Other')
  })

  it('"Diğer" with a title puts the title in the subject, in either language, and keeps the label for the body', () => {
    expect(contactSubjectLine('diger', 'Şampiyona önerisi', 'tr')).toEqual({ label: 'Diğer', title: 'Şampiyona önerisi', line: 'Speedcubing Türkiye: Şampiyona önerisi' })
    expect(contactSubjectLine('diger', 'Sponsorship idea', 'en')).toEqual({ label: 'Other', title: 'Sponsorship idea', line: 'Speedcubing Türkiye: Sponsorship idea' })
  })

  it('collapses inner whitespace and trims the title', () => {
    expect(contactSubjectLine('diger', '  Çok   boşluklu \t  başlık  ', 'tr')?.title).toBe('Çok boşluklu başlık')
  })

  it('rejects a title with a line break (null), whatever else it holds', () => {
    for (const bad of ['a\r\nBcc: x@y.z', 'a\nb', 'a\rb', 'title\n', '\rtitle']) {
      expect(contactSubjectLine('diger', bad, 'tr')).toBeNull()
    }
  })

  it(`caps the title at ${TITLE_MAX} characters, never inside an emoji and never leaving a trailing space`, () => {
    expect(contactSubjectLine('diger', 'a'.repeat(150), 'tr')?.title).toBe('a'.repeat(100))
    expect(contactSubjectLine('diger', '😀'.repeat(101), 'tr')?.title).toBe('😀'.repeat(100))
    expect(contactSubjectLine('diger', `${'a'.repeat(99)} b`, 'tr')?.title).toBe('a'.repeat(99))
    expect(TITLE_MAX).toBe(100)
  })

  it('ignores a title for every other subject, even one with a line break', () => {
    expect(contactSubjectLine('genel', 'Bir başlık', 'tr')).toEqual({ label: 'Genel', title: '', line: 'Speedcubing Türkiye: Genel' })
    expect(contactSubjectLine('kvkk', 'a\r\nb', 'en')).toEqual({ label: 'Data protection request', title: '', line: 'Speedcubing Türkiye: Data protection request' })
  })
})

describe('sendContact', () => {
  const form =(fields: Record<string, string> = {}) => {
    const data = new FormData()
    const all = { name: 'Kutay Temel', email: 'kutay@example.com', subject: 'genel', message: 'Merhaba, bir sorum var.', locale: 'tr', ...fields }
    for (const [key, value] of Object.entries(all)) data.set(key, value)
    return data
  }

  beforeEach(() => {
    vi.mocked(sendMail).mockReset()
    vi.mocked(sendMail).mockResolvedValue(true)
  })

  it('mails the team from "<name> (form)" with the label subject, Reply-To the writer and the label in the body', async () => {
    expect(await sendContact({ ok: false }, form())).toEqual({ ok: true })
    expect(sendMail).toHaveBeenCalledExactlyOnceWith({
      to: site.contactEmail,
      replyTo: 'kutay@example.com',
      fromName: 'Kutay Temel (form)',
      subject: 'Speedcubing Türkiye: Genel',
      text: 'Ad: Kutay Temel\nE-posta: kutay@example.com\nKonu: Genel\nDil: tr\n\nMerhaba, bir sorum var.',
    })
  })

  it('English form: the English label in the subject and the body', async () => {
    await sendContact({ ok: false }, form({ locale: 'en', subject: 'medya' }))
    expect(vi.mocked(sendMail).mock.calls[0][0]).toMatchObject({ subject: 'Speedcubing Türkiye: Media / press' })
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toContain('Konu: Media / press\nDil: en\n')
  })

  it('"Diğer" with a title: the title is the subject and gets its own line under the subject label', async () => {
    await sendContact({ ok: false }, form({ subject: 'diger', title: '  Sponsor   önerisi ' }))
    expect(vi.mocked(sendMail).mock.calls[0][0]).toMatchObject({
      subject: 'Speedcubing Türkiye: Sponsor önerisi',
      text: 'Ad: Kutay Temel\nE-posta: kutay@example.com\nKonu: Diğer\nBaşlık: Sponsor önerisi\nDil: tr\n\nMerhaba, bir sorum var.',
    })
  })

  it('"Diğer" without a title, and a title on another subject: no title line, the label subject', async () => {
    await sendContact({ ok: false }, form({ subject: 'diger' }))
    await sendContact({ ok: false }, form({ subject: 'yarisma', title: 'Yok sayılır' }))
    const [diger, yarisma] = vi.mocked(sendMail).mock.calls.map(([mail]) => mail)
    expect(diger).toMatchObject({ subject: 'Speedcubing Türkiye: Diğer' })
    expect(yarisma).toMatchObject({ subject: 'Speedcubing Türkiye: Yarışma' })
    expect(diger.text).not.toContain('Başlık')
    expect(yarisma.text).not.toContain('Başlık')
  })

  it('a title with a line break is invalid, like a name with one, and nothing is sent', async () => {
    expect(await sendContact({ ok: false }, form({ subject: 'diger', title: 'x\r\nBcc: a@b.co' }))).toEqual({ ok: false, error: 'invalid' })
    expect(await sendContact({ ok: false }, form({ name: 'Kutay\r\nBcc: a@b.co' }))).toEqual({ ok: false, error: 'invalid' })
    expect(await sendContact({ ok: false }, form({ subject: 'nope' }))).toEqual({ ok: false, error: 'invalid' })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('reports send_failed when the mail is refused', async () => {
    vi.mocked(sendMail).mockResolvedValue(false)
    expect(await sendContact({ ok: false }, form())).toEqual({ ok: false, error: 'send_failed' })
  })
})
