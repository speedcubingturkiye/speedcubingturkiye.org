import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serialize } from 'next-mdx-remote/serialize'
import remarkGfm from 'remark-gfm'
import { announceNew, renderAnnouncement, renderAnnouncementMail } from '@/lib/announce'
import { wcaFetch } from '@/lib/wca/client'
import { commitFiles, fileExists } from '@/lib/github'
import { mailSubscribers } from '@/lib/newsletter'
import { site } from '@/site.config'
import type { CompetitionListItem } from '@/lib/wca/types'

// I/O modules are mocked; renderAnnouncement / renderAnnouncementMail do not touch them.
vi.mock('@/lib/wca/client', () => ({ wcaFetch: vi.fn() }))
vi.mock('@/lib/github', () => ({ fileExists: vi.fn(), commitFiles: vi.fn() }))
vi.mock('@/lib/newsletter', () => ({ mailSubscribers: vi.fn() }))

const comp: CompetitionListItem = {
  id: 'NewAgeTurkey2026',
  name: 'New Age Turkey 2026',
  city: 'Istanbul',
  country_iso2: 'TR',
  start_date: '2026-10-31',
  end_date: '2026-11-01',
  registration_open: '2026-09-26T09:00:00.000Z',
  registration_close: '2026-10-26T14:00:00.000Z',
  announced_at: '2026-09-22T11:02:03.000Z',
  competitor_limit: 90,
  event_ids: ['333', '222', '444'],
  url: 'https://www.worldcubeassociation.org/competitions/NewAgeTurkey2026',
  delegates: [{ id: 1, name: 'A Delegate', wca_id: '2015NICH04' }],
  organizers: [],
}

describe('renderAnnouncement', () => {
  it('writes tr.mdx, en.mdx and index.yaml (last) under content/news/yarisma-<lowercased id>', () => {
    const files = renderAnnouncement(comp)
    expect(files.map((f) => f.path)).toEqual([
      'content/news/yarisma-newageturkey2026/tr.mdx',
      'content/news/yarisma-newageturkey2026/en.mdx',
      'content/news/yarisma-newageturkey2026/index.yaml',
    ])
    const index = files[2].content
    expect(index).toContain('title: "Yeni yarışma: New Age Turkey 2026"')
    expect(index).toContain('titleEn: "New competition: New Age Turkey 2026"')
    // Intl formatRange puts thin spaces (U+2009) around the dash, hence \s
    expect(index).toMatch(/^description: "31 Ekim\s–\s1 Kasım 2026 · İstanbul"$/m)
    expect(index).toMatch(/^descriptionEn: "31 October\s–\s1 November 2026 · İstanbul"$/m)
    expect(index).toMatch(/^date: \d{4}-\d{2}-\d{2}$/m)
    expect(index).toContain('category: yarisma')
    expect(index).toContain('auto: true')
    expect(index.split('\n').filter(Boolean)).toHaveLength(7) // the required keys only, bulten left out (it reads as false): the reader rejects any other
  })

  it('writes bare MDX bodies with the WCA link and the unprefixed guide link in both languages', () => {
    const [tr, en] = renderAnnouncement(comp)
    for (const f of [tr, en]) {
      expect(f.content.startsWith('---')).toBe(false)
      expect(f.content).toContain(comp.url)
      expect(f.content).toContain('](/yarismalar/ilk-yarismam)') // no /en: the MDX link component adds the prefix
      expect(f.content).not.toContain('{') // MDX expressions: never emit braces
    }
    expect(tr.content).toContain('**New Age Turkey 2026** WCA takvimine eklendi.')
    expect(tr.content).toContain('İstanbul')
    expect(en.content).toContain('**New Age Turkey 2026** has been added to the WCA calendar.')
  })

  it('escapes MDX syntax in WCA strings the way the editor does, so the site and the panel both read the file', async () => {
    const [tr, , index] = renderAnnouncement({ ...comp, name: 'Cube {Open} <2026>', city: 'Kadıköy < İstanbul' })
    expect(tr.content).toContain(String.raw`**Cube \{Open\} \<2026\>** WCA takvimine eklendi.`)
    expect(tr.content).toContain(String.raw`- **Şehir:** Kadıköy \< İstanbul`)
    expect(index.content).toContain('title: "Yeni yarışma: Cube {Open} <2026>"') // YAML, not MDX: JSON quoting is enough
    // Same compiler and options as lib/content.ts; an unescaped { or < throws here.
    await expect(serialize(tr.content, { mdxOptions: { remarkPlugins: [remarkGfm] } })).resolves.toBeTruthy()
  })
})

describe('renderAnnouncementMail', () => {
  it('is the news body in one language, with read-more on the competition page', () => {
    const tr = renderAnnouncementMail(comp, 'tr', `${site.url}/bulten/cikis?t=x`)
    expect(tr.subject).toBe('Yeni yarışma: New Age Turkey 2026')
    expect(tr.html).toContain(`href="${comp.url}"`)
    expect(tr.html).toContain(`href="${site.url}/yarismalar/NewAgeTurkey2026"`)
    expect(tr.html).toContain(`href="${site.url}/yarismalar/ilk-yarismam"`)
    expect(tr.html).toContain(`href="${site.url}/bulten/cikis?t=x"`)
    const en = renderAnnouncementMail(comp, 'en', `${site.url}/en/bulten/cikis?t=x`)
    expect(en.subject).toBe('New competition: New Age Turkey 2026')
    expect(en.html).toContain(`href="${site.url}/en/yarismalar/NewAgeTurkey2026"`)
    expect(en.html).toContain(`href="${site.url}/en/yarismalar/ilk-yarismam"`)
    expect(en.text).toContain(comp.url)
  })

  it('keeps each language in its own mail: the English body phrase only in the English mail, the Turkish only in the Turkish one', () => {
    const tr = renderAnnouncementMail(comp, 'tr', `${site.url}/bulten/cikis?t=x`)
    const en = renderAnnouncementMail(comp, 'en', `${site.url}/en/bulten/cikis?t=x`)
    for (const part of ['html', 'text'] as const) {
      expect(en[part]).toContain('has been added to the WCA calendar')
      expect(en[part]).not.toContain('WCA takvimine eklendi')
      expect(tr[part]).toContain('WCA takvimine eklendi')
      expect(tr[part]).not.toContain('has been added to the WCA calendar')
    }
  })

  it('escapes HTML in names', () => {
    const html = renderAnnouncementMail({ ...comp, name: 'A <b> & B' }, 'tr', 'https://x/u').html
    expect(html).toContain('A &lt;b&gt; &amp; B')
    expect(html).not.toContain('<b>')
  })
})

describe('announceNew', () => {
  const other = { ...comp, id: 'OtherTurkey2026' }
  const dir = (id: string) => `content/news/yarisma-${id.toLowerCase()}`

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(mailSubscribers).mockResolvedValue({ sent: { tr: 1, en: 0 }, failed: 0 })
    vi.mocked(commitFiles).mockResolvedValue('ok') // one commit holds the bodies and the index.yaml marker
  })

  it('refuses a competition id outside [A-Za-z0-9]+ before touching Git or SES, but still processes the rest of the batch', async () => {
    // The bad id comes first: a `return`/`break` instead of `continue` would leave `other`, right after it, unprocessed.
    vi.mocked(wcaFetch).mockResolvedValue([{ ...other, id: '../Evil2026' }, other])
    vi.mocked(fileExists).mockResolvedValue(false)
    expect(await announceNew({ dry: false })).toEqual({ announced: [other.id], skipped: 0, failed: ['../Evil2026'], wcaUnavailable: false })
    expect(vi.mocked(fileExists).mock.calls.map(([p]) => p)).toEqual([`${dir(other.id)}/index.yaml`])
    expect(commitFiles).toHaveBeenCalledTimes(1)
    expect(mailSubscribers).toHaveBeenCalledTimes(1)
  })

  it('reports wcaUnavailable when the WCA request fails', async () => {
    vi.mocked(wcaFetch).mockResolvedValue(null)
    expect(await announceNew({ dry: false })).toEqual({ announced: [], skipped: 0, failed: [], wcaUnavailable: true })
    vi.mocked(wcaFetch).mockRejectedValue(new Error('WCA 429')) // wcaFetch throws on 429/5xx/network
    expect(await announceNew({ dry: false })).toEqual({ announced: [], skipped: 0, failed: [], wcaUnavailable: true })
  })

  it('skips announced ids (index.yaml exists), commits + mails new ones, and lists failed commits', async () => {
    const third = { ...comp, id: 'ThirdTurkey2026' }
    vi.mocked(wcaFetch).mockResolvedValue([comp, other, third])
    vi.mocked(fileExists).mockImplementation(async (p) => p.startsWith(dir(comp.id)))
    vi.mocked(commitFiles).mockImplementation(async (files) => (files[0].path.startsWith(dir(third.id)) ? 'error' : 'ok'))
    expect(await announceNew({ dry: false })).toEqual({ announced: [other.id], skipped: 1, failed: [third.id], wcaUnavailable: false })
    expect(commitFiles).toHaveBeenCalledTimes(2) // the announced id never gets one
    // One commit holds the three files; index.yaml, the marker, is also the path that must not exist yet at the head.
    expect(commitFiles).toHaveBeenCalledWith(
      [
        expect.objectContaining({ path: `${dir(other.id)}/tr.mdx` }),
        expect.objectContaining({ path: `${dir(other.id)}/en.mdx` }),
        expect.objectContaining({ path: `${dir(other.id)}/index.yaml`, content: expect.stringContaining('auto: true') }),
      ],
      `chore(news): auto-announce ${other.id}`,
      `${dir(other.id)}/index.yaml`,
    )
    expect(mailSubscribers).toHaveBeenCalledTimes(1)
  })

  it('does not mail when another run committed the announcement first ("exists"): neither announced nor failed', async () => {
    // Vercel may deliver one cron run twice: both pass the exists check, only one commit gets the marker onto main.
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockResolvedValue(false)
    vi.mocked(commitFiles).mockResolvedValue('exists')
    expect(await announceNew({ dry: false })).toEqual({ announced: [], skipped: 1, failed: [], wcaUnavailable: false })
    expect(mailSubscribers).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('announce_skipped', other.id, 'marker exists')
  })

  it.each(['conflict', 'error'] as const)('lists the competition as failed and mails nobody when the commit ends in "%s"', async (result) => {
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockResolvedValue(false)
    vi.mocked(commitFiles).mockResolvedValue(result) // commitFiles logged the GitHub status; the next run retries
    expect(await announceNew({ dry: false })).toEqual({ announced: [], skipped: 0, failed: [other.id], wcaUnavailable: false })
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('lists a competition whose check throws as failed', async () => {
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockRejectedValue(new Error('GitHub GET → 500'))
    expect(await announceNew({ dry: false })).toMatchObject({ announced: [], failed: [other.id] })
  })

  it('dry run lists new competitions without committing or mailing', async () => {
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockResolvedValue(false)
    expect(await announceNew({ dry: true })).toEqual({ announced: [other.id], skipped: 0, failed: [], wcaUnavailable: false })
    expect(commitFiles).not.toHaveBeenCalled()
    expect(mailSubscribers).not.toHaveBeenCalled()
  })

  it('logs how many recipients failed (a count, never an address) and still counts the competition as announced', async () => {
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockResolvedValue(false)
    vi.mocked(mailSubscribers).mockResolvedValue({ sent: { tr: 1, en: 0 }, failed: 2 })
    expect(await announceNew({ dry: false })).toMatchObject({ announced: [other.id], failed: [] })
    expect(console.error).toHaveBeenCalledWith('newsletter_failed', other.id, '2 recipients')
  })

  it('logs a failed mailing but still counts the competition as announced (the news is published)', async () => {
    vi.mocked(wcaFetch).mockResolvedValue([other])
    vi.mocked(fileExists).mockResolvedValue(false)
    vi.mocked(mailSubscribers).mockRejectedValue(Object.assign(new Error('slow down'), { name: 'TooManyRequestsException' }))
    expect(await announceNew({ dry: false })).toMatchObject({ announced: [other.id], failed: [] })
    expect(console.error).toHaveBeenCalledWith('newsletter_failed', other.id, 'TooManyRequestsException')
  })
})
