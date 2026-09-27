import type { Locale } from '@/i18n/routing'
import type { CompetitionListItem } from '@/lib/wca/types'
import { wcaFetch } from '@/lib/wca/client'
import { displayCity } from '@/lib/wca/city'
import { WCA_ID_RE, todayIstanbul } from '@/lib/wca/status'
import { formatDateRange, formatDateTime } from '@/lib/wca/format'
import { fileExists, putFiles, writeRepoFile } from '@/lib/github'
import { renderNewsMail, type RenderedMail } from '@/lib/mail-render'
import { mailSubscribers } from '@/lib/newsletter'
import { site } from '@/site.config'
import { trSlug } from '@/lib/slug'

// Literal strings (not next-intl) so this module stays pure and testable.
const T = {
  tr: {
    title: (name: string) => `Yeni yarışma: ${name}`,
    lead: (name: string) => `**${name}** WCA takvimine eklendi.`,
    date: 'Tarih',
    city: 'Şehir',
    reg: 'Kayıt',
    wca: 'WCA sayfası ve kayıt',
    guideLead: 'İlk yarışmana mı hazırlanıyorsun?',
    guide: 'İlk yarışmam rehberi',
  },
  en: {
    title: (name: string) => `New competition: ${name}`,
    lead: (name: string) => `**${name}** has been added to the WCA calendar.`,
    date: 'Date',
    city: 'City',
    reg: 'Registration',
    wca: 'WCA page and registration',
    guideLead: 'Preparing for your first competition?',
    guide: 'First competition guide',
  },
} as const

// WCA strings go into the MDX body: a stray { or < would fail every later build, so escape them (plus } and >).
const mdx = (s: string) => s.replace(/[{}<>]/g, '\\$&')

function regWindow(comp: CompetitionListItem, locale: Locale) {
  return `${formatDateTime(comp.registration_open, locale)} – ${formatDateTime(comp.registration_close, locale)}`
}

/** content/news/yarisma-<id> (spec §3.1); the WCA id is lowercased like every panel slug (trSlug). */
export const newsDir = (comp: CompetitionListItem) => `content/news/yarisma-${trSlug(comp.id)}`

function body(comp: CompetitionListItem, locale: Locale): string {
  const s = T[locale]
  return [
    s.lead(mdx(comp.name)),
    '',
    `- **${s.date}:** ${formatDateRange(comp.start_date, comp.end_date, locale)}`,
    `- **${s.city}:** ${mdx(displayCity(comp.city))}`,
    `- **${s.reg}:** ${regWindow(comp, locale)}`,
    '',
    `[${s.wca}](${comp.url})`,
    '',
    `${s.guideLead} [${s.guide}](/yarismalar/ilk-yarismam)`, // unprefixed on purpose (MDX link convention)
    '',
  ].join('\n')
}

/** The news summary line: dates · city. */
function summary(comp: CompetitionListItem, locale: Locale): string {
  return `${formatDateRange(comp.start_date, comp.end_date, locale)} · ${displayCity(comp.city)}`
}

/**
 * The three files of one announcement: tr.mdx, en.mdx and, last, index.yaml. index.yaml is the "already announced"
 * marker (announceNew), so a run that dies halfway never leaves a marker without bodies.
 */
export function renderAnnouncement(comp: CompetitionListItem): { path: string; content: string }[] {
  const dir = newsDir(comp)
  // JSON.stringify produces a valid YAML double-quoted scalar (handles quotes/colons in names). Every required key of the
  // Keystatic schema (keystatic.config.ts, collection news), with bulten left out (it reads as false): the reader
  // rejects unknown keys.
  const index = [
    `title: ${JSON.stringify(T.tr.title(comp.name))}`,
    `titleEn: ${JSON.stringify(T.en.title(comp.name))}`,
    `description: ${JSON.stringify(summary(comp, 'tr'))}`,
    `descriptionEn: ${JSON.stringify(summary(comp, 'en'))}`,
    `date: ${todayIstanbul()}`,
    'category: yarisma',
    'auto: true',
    '',
  ].join('\n')
  return [
    { path: `${dir}/tr.mdx`, content: body(comp, 'tr') },
    { path: `${dir}/en.mdx`, content: body(comp, 'en') },
    { path: `${dir}/index.yaml`, content: index },
  ]
}

/** The announcement mail in one language: the news body just committed. Read-more goes to the competition page, which
 *  renders on demand; the news article itself only exists after the commit's redeploy. */
export function renderAnnouncementMail(comp: CompetitionListItem, locale: Locale, unsubscribeUrl: string): RenderedMail {
  return renderNewsMail({
    locale,
    title: T[locale].title(comp.name),
    description: summary(comp, locale),
    source: body(comp, locale),
    readMoreUrl: `${site.url}${locale === 'en' ? '/en' : ''}/yarismalar/${comp.id}`,
    unsubscribeUrl,
  })
}

export type AnnounceResult = { announced: string[]; skipped: number; failed: string[]; wcaUnavailable: boolean }

/**
 * Announce competitions announced in the last 30 days whose content/news/yarisma-<id>/index.yaml does not exist yet.
 * Idempotent: the Git files are the state, so failed ids (including a half-committed pair) are retried on the next run.
 * dry = list only, no commits, no emails.
 */
export async function announceNew({ dry }: { dry: boolean }): Promise<AnnounceResult> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  // wcaFetch throws on 429/5xx/network (for ISR); here any failure just means "WCA unavailable" → HTTP 500 JSON.
  const comps = await wcaFetch<CompetitionListItem[]>(
    `/api/v0/competitions?country_iso2=TR&announced_after=${since}&include_cancelled=false&sort=-announced_at&per_page=100`,
    0,
  ).catch(() => null)
  const announced: string[] = []
  const failed: string[] = []
  let skipped = 0
  if (!comps) return { announced, skipped, failed, wcaUnavailable: true }

  for (const comp of comps) {
    // Trust boundary for the one write path the site has: the id becomes a repo path and a mailing link.
    if (!WCA_ID_RE.test(comp.id)) {
      // JSON.stringify, not the raw id: this value is untrusted, and CR/LF in it could forge log lines.
      console.error('announce: refusing competition id', JSON.stringify(comp.id))
      failed.push(comp.id)
      continue
    }
    try {
      const files = renderAnnouncement(comp)
      // index.yaml is written last, so its presence means the whole set is there (spec §3.1).
      if (await fileExists(files[files.length - 1].path)) {
        skipped++
        continue
      }
      if (!dry) {
        // A set left half-written by a failed run (bodies, no marker) is rewritten whole; its mailing was never sent.
        const message = `chore(news): auto-announce ${comp.id}`
        const marker = files[files.length - 1]
        if (!(await putFiles(files.slice(0, -1), message))) {
          failed.push(comp.id) // putFiles logged the GitHub status
          continue
        }
        // The marker is created without a sha, so it is create-only: Vercel may deliver one cron run twice, both runs pass
        // the exists check above, and GitHub lets only one of them create index.yaml. The other must not mail again.
        const claim = await writeRepoFile(marker.path, marker.content, message, null)
        if (claim === 'conflict') {
          console.log('announce_skipped', comp.id, 'marker exists') // another run owns this competition
          skipped++
          continue
        }
        if (claim === 'error') {
          failed.push(comp.id) // writeRepoFile logged the GitHub status; the next run retries
          continue
        }
        // The news is published either way; a failed mailing is logged, never retried (no double mails).
        try {
          const report = await mailSubscribers((locale, links) => renderAnnouncementMail(comp, locale, links.page))
          if (report.failed > 0) console.error('newsletter_failed', comp.id, `${report.failed} recipients`)
        } catch (e) {
          console.error('newsletter_failed', comp.id, e instanceof Error ? e.name : String(e))
        }
      }
      announced.push(comp.id)
    } catch (e) {
      console.error('announce failed', comp.id, e)
      failed.push(comp.id)
    }
  }
  return { announced, skipped, failed, wcaUnavailable: false }
}
