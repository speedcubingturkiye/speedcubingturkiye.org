import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { LOCALE_SCRIPT, THEME_SCRIPT } from '@/lib/head-scripts'

type Page = { path?: string; stored?: Record<string, string>; languages?: string[]; ua?: string; dark?: boolean; blocked?: boolean }

/** Runs a head script against a fake page; returns where it sent the visitor and what it set on <html>. */
function run(script: string, { path = '/', stored = {}, languages = ['tr-TR'], ua = 'Mozilla/5.0 Chrome/141', dark = false, blocked = false }: Page) {
  const html = { dataset: {} as Record<string, string>, style: {} as Record<string, string> }
  let sentTo: string | null = null
  runInNewContext(script, {
    document: { documentElement: html },
    localStorage: {
      getItem: (key: string) => {
        if (blocked) throw new Error('blocked')
        return stored[key] ?? null
      },
    },
    navigator: { userAgent: ua, languages, language: languages[0] },
    location: { pathname: path, search: '?ara=x', hash: '#a', replace: (to: string) => (sentTo = to) },
    matchMedia: () => ({ matches: dark }),
  })
  return { sentTo, html }
}

describe('LOCALE_SCRIPT', () => {
  it('sends a browser without Turkish to the English page, and a Turkish one to the Turkish page', () => {
    expect(run(LOCALE_SCRIPT, { path: '/siralamalar', languages: ['de-DE', 'en-US'] }).sentTo).toBe('/en/siralamalar?ara=x#a')
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['fr'] }).sentTo).toBe('/en?ara=x#a')
    expect(run(LOCALE_SCRIPT, { path: '/en/siralamalar', languages: ['tr-TR', 'en'] }).sentTo).toBe('/siralamalar?ara=x#a')
    expect(run(LOCALE_SCRIPT, { path: '/en', languages: ['tr'] }).sentTo).toBe('/?ara=x#a')
  })

  it('goes by the first of Turkish and English the browser lists, and hides the page it leaves', () => {
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en-US', 'tr-TR'] }).sentTo).toBe('/en?ara=x#a')
    expect(run(LOCALE_SCRIPT, { path: '/en', languages: ['de', 'tr', 'en'] }).sentTo).toBe('/?ara=x#a')
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en'] }).html.style.display).toBe('none')
  })

  it('stays where the language already fits, after a choice in the menu, for a crawler and without storage', () => {
    expect(run(LOCALE_SCRIPT, { path: '/haberler', languages: ['tr-TR'] }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/en/news', languages: ['en-GB'] }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en'], stored: { locale: 'tr' } }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en'], ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en'], ua: 'Mozilla/5.0 Google-InspectionTool/1.0' }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/', languages: ['en'], blocked: true }).sentTo).toBeNull()
    expect(run(LOCALE_SCRIPT, { path: '/english-page', languages: ['en'] }).sentTo).toBe('/en/english-page?ara=x#a')
  })
})

describe('THEME_SCRIPT', () => {
  it('follows the system setting unless the visitor chose light or dark', () => {
    expect(run(THEME_SCRIPT, { dark: true }).html.dataset).toEqual({ themePref: 'system', theme: 'dark' })
    expect(run(THEME_SCRIPT, { dark: false }).html.dataset).toEqual({ themePref: 'system', theme: 'light' })
    expect(run(THEME_SCRIPT, { dark: true, stored: { theme: 'light' } }).html.dataset).toEqual({ themePref: 'light', theme: 'light' })
    expect(run(THEME_SCRIPT, { dark: false, stored: { theme: 'dark' } }).html.dataset).toEqual({ themePref: 'dark', theme: 'dark' })
    expect(run(THEME_SCRIPT, { dark: true, blocked: true }).html.dataset).toEqual({ themePref: 'system', theme: 'dark' })
  })
})
