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

/** A file on main (or at `ref`, a branch or commit sha) as the Contents API returns it (`content` is base64), or null when
 *  it does not exist. Throws on other statuses, the response text as the error's cause. */
async function getFile(c: Cfg, filePath: string, ref = BRANCH): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(`${API}/repos/${c.repo}/contents/${encPath(filePath)}?ref=${ref}`, {
    headers: headers(c.token),
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub GET ${filePath} → ${res.status}`, { cause: await res.text().catch(() => '') })
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

const COMMIT_MUTATION = 'mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }'

type GraphQLError = { type?: string; message?: string }
type CommitReply = { data?: { createCommitOnBranch?: { commit?: { oid?: string } } | null }; errors?: GraphQLError[] }

// GitHub's refusal when main no longer points at expectedHeadOid; some replies leave out the type.
const isStale = (e: GraphQLError) => e.type === 'STALE_DATA' || /expected branch to point to|is at .* but expected/i.test(e.message ?? '')

/** Several files in ONE commit on main (GraphQL createCommitOnBranch). GitHub accepts it only while main still points at the
 *  head where `mustNotExist` was checked (expectedHeadOid), so of two concurrent runs only one commits; the other retries,
 *  finds the path and gets 'exists'. 'conflict': main moved under us on all 3 attempts. */
export async function commitFiles(
  files: { path: string; content: string }[],
  message: string,
  mustNotExist?: string,
): Promise<'ok' | 'exists' | 'conflict' | 'error'> {
  const c = cfg()
  if (!c) {
    console.log('[github:dev] would commit', message, files.map((f) => f.path))
    return 'ok'
  }
  const [headline, ...rest] = message.split('\n')
  const body = rest.join('\n').trim()
  const additions = files.map((f) => ({ path: f.path, contents: Buffer.from(f.content, 'utf8').toString('base64') }))
  let stale = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await fetch(`${API}/repos/${c.repo}/git/ref/heads/${BRANCH}`, { headers: headers(c.token), cache: 'no-store' })
    if (!ref.ok) {
      console.error(`GitHub GET git/ref/heads/${BRANCH} → ${ref.status}`, await ref.text().catch(() => ''))
      return 'error'
    }
    const head = ((await ref.json()) as { object: { sha: string } }).object.sha
    if (mustNotExist) {
      const found = await getFile(c, mustNotExist, head).catch((e: Error) => e)
      if (found instanceof Error) {
        console.error(found.message, found.cause ?? '') // a status other than 200 or 404
        return 'error'
      }
      if (found) return 'exists' // another run already committed it
    }
    const res = await fetch(`${API}/graphql`, {
      method: 'POST',
      headers: { ...headers(c.token), 'content-type': 'application/json' },
      body: JSON.stringify({
        query: COMMIT_MUTATION,
        variables: {
          input: {
            branch: { repositoryNameWithOwner: c.repo, branchName: BRANCH },
            expectedHeadOid: head,
            message: { headline, ...(body ? { body } : {}) },
            fileChanges: { additions },
          },
        },
      }),
    })
    if (!res.ok) {
      console.error(`GitHub GraphQL createCommitOnBranch → ${res.status}`, await res.text().catch(() => ''))
      return 'error'
    }
    // GraphQL answers 200 even when it refuses: only a reply without errors that names the new commit counts as done.
    const out = (await res.json()) as CommitReply
    const errors = out.errors ?? []
    if (!errors.length && out.data?.createCommitOnBranch?.commit?.oid) return 'ok'
    const reason = errors.length ? errors.map((e) => e.message ?? e.type).join('; ') : JSON.stringify(out) // no errors, no commit
    if (errors.some(isStale)) {
      stale = reason // main moved since the head was read: start over from the new head
      continue
    }
    console.error(`GitHub GraphQL createCommitOnBranch → ${errors[0]?.type ?? res.status}`, reason)
    return 'error'
  }
  // Logged like writeRepoFile's conflicts: a persistent refusal would otherwise look like an ordinary race.
  console.error('GitHub GraphQL createCommitOnBranch → STALE_DATA (conflict)', stale)
  return 'conflict'
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
