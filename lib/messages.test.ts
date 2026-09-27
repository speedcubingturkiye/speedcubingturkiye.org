// lib/messages.test.ts
import { describe, expect, it } from 'vitest'
import { checkMessages, flattenMessages, messagesSchema, placeholders } from '@/lib/messages'
import tr from '@/messages/tr.json'
import en from '@/messages/en.json'

describe('messagesSchema', () => {
  it('mirrors the key tree: an object per namespace, a text field per leaf', () => {
    const schema = messagesSchema({ common: { siteName: 'x', nested: { deep: 'y' } } }, 'not')
    expect(Object.keys(schema)).toEqual(['common'])
    const common = schema.common as { kind: string; label?: string; description?: string; fields: Record<string, { kind: string; label?: string; fields?: Record<string, unknown> }> }
    expect(common.kind).toBe('object')
    expect(common.label).toBe('common')
    expect(common.description).toBe('not')
    expect(common.fields.siteName.kind).toBe('form')
    expect(common.fields.siteName.label).toBe('siteName')
    expect(common.fields.nested.kind).toBe('object')
    expect(Object.keys(common.fields.nested.fields ?? {})).toEqual(['deep'])
  })
})

describe('flattenMessages / placeholders', () => {
  it('flattens with dotted keys and lists ICU argument names sorted, each once', () => {
    expect(flattenMessages({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual({ 'a.b': 'x', 'a.c.d': 'y', e: 'z' })
    expect(placeholders('{taken}/{limit}')).toEqual(['limit', 'taken'])
    expect(placeholders('Son güncelleme: {date}')).toEqual(['date'])
    expect(placeholders('{name} ve {name}')).toEqual(['name'])
    expect(placeholders('düz metin')).toEqual([])
  })
})

describe('checkMessages', () => {
  it('passes for the repo files', () => {
    expect(checkMessages(tr, en)).toEqual([])
  })

  it('reports missing keys, placeholder drift and unbalanced braces in Turkish with the file and key', () => {
    expect(checkMessages({ a: { x: '{date}' } }, { a: {} })).toEqual(['messages/en.json: "a.x" anahtarı eksik'])
    expect(checkMessages({ a: {} }, { a: { x: 'y' } })).toEqual(['messages/tr.json: "a.x" anahtarı eksik'])
    expect(checkMessages({ a: { x: '{date}' } }, { a: { x: '{day}' } })).toEqual([
      'messages/en.json: "a.x" yer tutucuları TR ile aynı değil (tr: {date}; en: {day})',
    ])
    expect(checkMessages({ a: { x: '{date' } }, { a: { x: '{date}' } })).toEqual([
      'messages/tr.json: "a.x" değerinde süslü parantezler eşleşmiyor: "{date"',
    ])
  })

  it('compares placeholder names as sets: a name used twice in one language and once in the other is fine', () => {
    expect(checkMessages({ a: { x: '{name} ve {name}' } }, { a: { x: '{name}' } })).toEqual([])
    expect(checkMessages({ a: { x: '{name}' } }, { a: { x: '{name}, {name}' } })).toEqual([])
  })
})
