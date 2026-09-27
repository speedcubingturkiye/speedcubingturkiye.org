// scripts/pending-newsletters.ts: used by .github/workflows/bulten.yml (spec §6.6): the oldest news entry marked
// "Bültenle gönder" that content/newsletter-log.json does not list. Writes slug=<slug> and hash=<its content hash>
// (both empty when there is none) to $GITHUB_OUTPUT and the preview links to $GITHUB_STEP_SUMMARY for the reviewers;
// prints the summary either way. The find job then waits for that hash to be live before approval is requested;
// the route refuses any other content.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { listNewsletterFlags, newsHash } from '@/lib/news'
import { LOG_PATH, parseLog, pendingSlugs } from '@/lib/newsletter-log'
import { site } from '@/site.config'

async function main() {
  const log = parseLog(existsSync(LOG_PATH) ? readFileSync(LOG_PATH, 'utf8') : undefined)
  const pending = pendingSlugs(await listNewsletterFlags(), log)
  const slug = pending[0] ?? ''
  const hash = slug ? ((await newsHash(slug)) ?? '') : ''
  const summary = slug
    ? [
        `## Bülten onayı: ${slug}`,
        '',
        `- Önizleme (TR): ${site.url}/bulten/onizleme/${slug}`,
        `- Önizleme (EN): ${site.url}/en/bulten/onizleme/${slug}`,
        `- İçerik özeti: \`${hash.slice(0, 12)}\``,
        `- Haber: ${site.url}/haberler/${slug}`,
        ...(pending.length > 1 ? ['', `Sırada bekleyen: ${pending.slice(1).join(', ')}`] : []),
      ].join('\n')
    : 'Gönderilecek bülten yok.'
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\nhash=${hash}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  console.log(summary)
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
