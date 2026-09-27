// lib/mail-render.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { absoluteUrl, renderConfirmMail, renderNewsMail, unsubscribeHeaders } from '@/lib/mail-render'
import { MDX_COMPONENTS } from '@/lib/content-check'
import { escapeHtml } from '@/lib/escape-html'
import { site } from '@/site.config'
import tr from '@/messages/tr.json'
import en from '@/messages/en.json'

const base = { title: 'Başlık <b>', description: 'Özet & more', readMoreUrl: `${site.url}/haberler/x`, unsubscribeUrl: `${site.url}/bulten/cikis?t=abc` }
const mail = (source: string, locale: 'tr' | 'en' = 'tr') => renderNewsMail({ ...base, locale, source })

afterEach(() => {
  vi.restoreAllMocks() // the console.warn spy of one test must not silence the next
})

describe('mail frame', () => {
  it('shows the mail logo from our own host and asks mail apps to keep the light scheme', () => {
    for (const html of [mail('Metin.').html, renderConfirmMail({ locale: 'en', confirmUrl: `${site.url}/en/bulten/onay?t=x` }).html]) {
      expect(html).toContain(`<img src="${site.url}/brand/logo-mail.png" width="300" height="36" alt="Speedcubing Türkiye"`)
      expect(html).toContain('<meta name="color-scheme" content="light only">')
    }
  })
})

describe('absoluteUrl', () => {
  it('prefixes pages with the language and leaves public files and other hosts alone', () => {
    expect(absoluteUrl('/kvkk#bulten', 'tr')).toBe(`${site.url}/kvkk#bulten`)
    expect(absoluteUrl('/kvkk#bulten', 'en')).toBe(`${site.url}/en/kvkk#bulten`)
    expect(absoluteUrl('/', 'en')).toBe(`${site.url}/en`)
    expect(absoluteUrl('/images/news/a.jpg', 'en')).toBe(`${site.url}/images/news/a.jpg`)
    expect(absoluteUrl('/docs/tuzuk-tr.pdf', 'en')).toBe(`${site.url}/docs/tuzuk-tr.pdf`)
    expect(absoluteUrl('https://www.worldcubeassociation.org/x', 'en')).toBe('https://www.worldcubeassociation.org/x')
  })

  it('does not take a protocol-relative address (//host/path) for a path on the site', () => {
    expect(absoluteUrl('//evil.example/x.png', 'en')).toBe('//evil.example/x.png')
    expect(absoluteUrl('//evil.example/page', 'tr')).toBe('//evil.example/page')
  })
})

describe('renderNewsMail', () => {
  it('uses the title as subject and escapes the title and summary', () => {
    const m = mail('Metin.')
    expect(m.subject).toBe('Başlık <b>')
    expect(m.html).toContain('Başlık &lt;b&gt;')
    expect(m.html).toContain('Özet &amp; more')
    expect(m.html).not.toContain('<b>')
    expect(m.html).toContain('<html lang="tr">')
  })

  it("renders Markdown with absolute links and only the site's own images", () => {
    const m = mail('**kalın** _italik_ [iç](/kvkk#bulten) [dış](https://example.com) [kötü](javascript:alert(1))\n\n![foto](/images/news/a.jpg)\n\n![uzak](https://evil.example/x.png)', 'en')
    expect(m.html).toContain('<strong>kalın</strong>')
    expect(m.html).toContain('<em>italik</em>')
    expect(m.html).toContain(`href="${site.url}/en/kvkk#bulten"`)
    expect(m.html).toContain('href="https://example.com"')
    expect(m.html).not.toContain('javascript:')
    expect(m.html).toContain(`src="${site.url}/images/news/a.jpg"`)
    expect(m.html).not.toContain('evil.example')
  })

  it('never loads an image from another host, however the address is disguised', () => {
    const disguised = [
      '//evil.example/x.png', // protocol-relative
      'https://speedcubingturkiye.org.evil.example/x.png', // the site's name as a subdomain prefix
      'https://speedcubingturkiye.org@evil.example/x.png', // the site's name as credentials
      'data:image/png;base64,iVBORw0KGgo=',
      'http://evil.example/x.png',
    ]
    const images = (html: string) => [...html.matchAll(/<img src="([^"]*)"/g)].map((m) => m[1])
    const logo = `${site.url}/brand/logo-mail.png`
    for (const url of disguised) {
      for (const locale of ['tr', 'en'] as const) {
        const m = mail(`![alt](${url})`, locale)
        expect(images(m.html), url).toEqual([logo]) // only the frame's own logo
        expect(m.text, url).not.toContain('evil.example')
      }
    }
    // a control: the site's own file still renders
    expect(images(mail('![alt](/images/news/a.jpg)').html)).toEqual([logo, `${site.url}/images/news/a.jpg`])
  })

  it('renders lists, headings, quotes and rules', () => {
    const m = mail('## Başlık iki\n\n- bir\n- iki\n\n> alıntı\n\n---')
    expect(m.html).toMatch(/<h2[^>]*>Başlık iki<\/h2>/)
    expect(m.html).toMatch(/<ul[^>]*><li[^>]*>bir<\/li><li[^>]*>iki<\/li><\/ul>/)
    expect(m.html).toMatch(/<blockquote[^>]*><p[^>]*>alıntı<\/p><\/blockquote>/)
    expect(m.html).toContain('<hr')
    expect(m.text).toContain('- bir\n- iki')
  })

  it('indents every child of a nested list under its parent in the plain text, not only the first', () => {
    expect(mail('- parent\n  - a\n  - b\n- next').text).toContain('- parent\n  - a\n  - b\n- next')
    expect(mail('1. parent\n   1. a\n   2. b\n2. next').text).toContain('1. parent\n  1. a\n  2. b\n2. next')
    expect(mail('- top\n  - mid\n    - deep\n    - deeper\n  - mid two').text).toContain('- top\n  - mid\n    - deep\n    - deeper\n  - mid two')
  })

  it('keeps a two-paragraph list item as it was: the second paragraph indented under the marker', () => {
    expect(mail('- one\n\n  two\n- next').text).toContain('- one\n  two\n- next')
  })

  it('renders every component the panel and the build allow, so none is dropped from a mail', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const name of MDX_COMPONENTS) mail(`<${name}>metin</${name}>`)
    expect(warn.mock.calls.filter(([message]) => String(message).includes('dropped component'))).toEqual([])
  })

  it("maps the site's MDX components and drops the rest", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = mail(
      [
        '<Callout title="Not">içeride</Callout>',
        '<Details summary="Özet başlığı">gizli metin</Details>',
        'Yaz: <DataController field="email" />',
        '<MdxLink href="/kvkk" locale="tr">Türkçe metin</MdxLink>',
        '<Anchor id="bulten" />',
        '<Lang code="en">Speedcubing</Lang> kelimesi',
        '<Bilinmeyen />',
      ].join('\n\n'),
      'en',
    )
    expect(m.html).toContain('<p style="margin:0 0 8px;font-weight:bold">Not</p>') // the Callout's title, as its own element
    expect(m.html).toContain('içeride')
    expect(m.html).toContain('Özet başlığı')
    expect(m.html).toContain('gizli metin')
    expect(m.html).toContain(`href="mailto:${site.dataController.email}"`)
    expect(m.html).toContain(`href="${site.url}/kvkk"`) // the MdxLink's own locale, not the mail's
    expect(m.html).not.toContain('id="bulten"')
    expect(m.html).toContain('Speedcubing kelimesi')
    expect(warn).toHaveBeenCalledWith('mail-render: dropped component', 'Bilinmeyen')
    expect(m.text).toContain(site.dataController.email)
  })

  it('ends with "read more" and the unsubscribe link in both the HTML and the text', () => {
    const t = mail('Metin.')
    expect(t.html).toContain(`href="${base.readMoreUrl}"`)
    expect(t.html).toContain(`href="${escapeHtml(base.unsubscribeUrl)}"`)
    expect(t.html).toContain('Abonelikten çık')
    expect(t.text).toContain(base.readMoreUrl)
    expect(t.text).toContain(base.unsubscribeUrl)
    expect(mail('Text.', 'en').html).toContain('Unsubscribe')
  })
})

describe('renderConfirmMail', () => {
  it("repeats the form's consent text word for word and links the confirm address", () => {
    const url = `${site.url}/bulten/onay?t=abc`
    const t = renderConfirmMail({ locale: 'tr', confirmUrl: url })
    expect(t.subject).toBe('Bülten aboneliğini onayla')
    expect(t.html).toContain(escapeHtml(tr.forms.newsletterConsent))
    expect(t.html).toContain(`href="${escapeHtml(url)}"`)
    expect(t.text).toContain(tr.forms.newsletterConsent)
    expect(t.text).toContain(url)
    const e = renderConfirmMail({ locale: 'en', confirmUrl: url })
    expect(e.subject).toBe('Confirm your newsletter subscription')
    expect(e.html).toContain(escapeHtml(en.forms.newsletterConsent))
  })
})

describe('unsubscribeHeaders', () => {
  it('gives the RFC 8058 one-click pair', () => {
    expect(unsubscribeHeaders('https://x/api/bulten/cikis?t=abc')).toEqual({
      'List-Unsubscribe': '<https://x/api/bulten/cikis?t=abc>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })
})
