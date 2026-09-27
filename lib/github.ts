import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const API = 'https://api.github.com'
const BRANCH = 'main'

type Cfg = { token: string; repo: string }

/** Null in development when the token/repo is missing (local checkout is used instead). */
function cfg(): Cfg | null {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (token && repo) return { token, repo }
  // Named, because every log line prints e.name.
  if (process.env.NODE_ENV === 'production') throw Object.assign(new Error('GITHUB_TOKEN / GITHUB_REPO missing'), { name: 'GitHubConfigMissing' })
  return null
}

const headers = (token: string) => ({
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  authorization: `Bearer ${token}`,
})

const encPath = (p: string) => p.split('/').map(encodeURIComponent).join('/')

/** A file on main as the Contents API returns it (`content` is base64), or null when it does not exist. Throws on other
 *  statuses. */
async function getFile(c: Cfg, filePath: string): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(`${API}/repos/${c.repo}/contents/${encPath(filePath)}?ref=${BRANCH}`, {
    headers: headers(c.token),
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub GET ${filePath} → ${res.status}`)
  return (await res.json()) as { content: string; sha: string }
}

/** One Contents PUT on main; `sha` (the file's current blob sha) is only required when replacing an existing file. */
function putFile(c: Cfg, filePath: string, text: string, message: string, sha: string | null): Promise<Response> {
  return fetch(`${API}/repos/${c.repo}/contents/${encPath(filePath)}`, {
    method: 'PUT',
    headers: { ...headers(c.token), 'content-type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(text, 'utf8').toString('base64'), branch: BRANCH, ...(sha ? { sha } : {}) }),
  })
}

export async function fileExists(filePath: string): Promise<boolean> {
  const c = cfg()
  // Dev-only fallback; the hint stops Turbopack from tracing the whole project into the cron function
  if (!c) return existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), filePath))
  return (await getFile(c, filePath)) !== null
}

/** One commit per file, strictly sequential (concurrent Contents writes conflict). */
export async function putFiles(files: { path: string; content: string }[], message: string): Promise<boolean> {
  const c = cfg()
  if (!c) {
    console.log('[github:dev] would commit', message, files.map((f) => f.path))
    return true
  }
  for (const f of files) {
    const sha = (await getFile(c, f.path))?.sha ?? null // only required when replacing an existing file
    const res = await putFile(c, f.path, f.content, message, sha)
    if (res.status !== 200 && res.status !== 201) {
      console.error(`GitHub PUT ${f.path} → ${res.status}`, await res.text().catch(() => ''))
      return false
    }
  }
  return true
}

/** A text file on main with its blob sha, or null when it does not exist. Development without a token reads the local
 *  checkout (sha "local"). */
export async function readRepoFile(filePath: string): Promise<{ text: string; sha: string } | null> {
  const c = cfg()
  if (!c) {
    const local = path.join(/* turbopackIgnore: true */ process.cwd(), filePath)
    return existsSync(local) ? { text: readFileSync(local, 'utf8'), sha: 'local' } : null
  }
  const file = await getFile(c, filePath)
  return file ? { text: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha } : null
}

/** Writes one file only if it still has `sha` (null: it must not exist yet). 'conflict' when someone wrote it since. */
export async function writeRepoFile(filePath: string, text: string, message: string, sha: string | null): Promise<'ok' | 'conflict' | 'error'> {
  const c = cfg()
  if (!c) {
    console.log('[github:dev] would commit', message, filePath)
    return 'ok'
  }
  const res = await putFile(c, filePath, text, message, sha)
  if (res.status === 200 || res.status === 201) return 'ok'
  // 409: the sha is outdated; 422: the file exists but no sha was sent. Logged too: a persistent refusal (a ruleset, a bad
  // sha) would otherwise look like an ordinary race.
  if (res.status === 409 || res.status === 422) {
    console.error(`GitHub PUT ${filePath} → ${res.status} (conflict)`, await res.text().catch(() => ''))
    return 'conflict'
  }
  console.error(`GitHub PUT ${filePath} → ${res.status}`, await res.text().catch(() => ''))
  return 'error'
}
