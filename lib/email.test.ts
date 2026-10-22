import { describe, expect, it } from 'vitest'
import { canonicalEmail, readEmail } from '@/lib/email'
import { EMAIL_RE } from '@/app/actions/types'

describe('canonicalEmail', () => {
  it('writes one mailbox one way: Gmail without dots or a +tag, googlemail as gmail; elsewhere only the +tag goes', () => {
    expect(canonicalEmail('Kutay.Temel@gmail.com')).toBe('kutaytemel@gmail.com')
    expect(canonicalEmail('kutay.temel+speedcubing@GoogleMail.com')).toBe('kutaytemel@gmail.com')
    expect(canonicalEmail('ali.veli+news@outlook.com')).toBe('ali.veli@outlook.com')
    expect(canonicalEmail('  ayse@example.com ')).toBe('ayse@example.com')
  })
})

describe('readEmail', () => {
  it('checks a typed address and returns its one form, or null', () => {
    expect(readEmail(' Kutay.Temel+x@Gmail.com ')).toBe('kutaytemel@gmail.com')
    expect(readEmail('not an address')).toBeNull()
    expect(readEmail(`${'a'.repeat(250)}@x.com`)).toBeNull()
    expect(readEmail('...@gmail.com')).toBeNull() // nothing left of the Gmail name
  })
})

describe('EMAIL_RE', () => {
  it('refuses an address that a spreadsheet would read as a formula (= + - at the start)', () => {
    for (const bad of ['=hyperlink("x")@a.b', '+cmd@a.b', '-2+3@a.b', '@a@b.c']) expect(EMAIL_RE.test(bad)).toBe(false)
    expect(EMAIL_RE.test('a-b+c@d.ef')).toBe(true)
  })
})
