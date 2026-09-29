// lib/github.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commitFiles, fileExists, readRepoFile, writeRepoFile } from '@/lib/github'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('GITHUB_TOKEN', 'test-token')
  vi.stubEnv('GITHUB_REPO', 'owner/repo')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

// fileExists and commitFiles are what the announce cron commits through: pinned here so their GitHub calls stay put.
describe('fileExists', () => {
  it('is true for a file on main, false for a 404, and throws on any other status', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'abc' }), { status: 200 }))
    expect(await fileExists('content/news/yarisma-x/index.yaml')).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/owner/repo/contents/content/news/yarisma-x/index.yaml?ref=main')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { authorization: 'Bearer test-token' } })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    expect(await fileExists('content/news/yarisma-y/index.yaml')).toBe(false)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await expect(fileExists('x.yaml')).rejects.toThrow('GitHub GET x.yaml → 500')
  })
})

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const script = (...responses: Response[]) => responses.forEach((r) => fetchMock.mockResolvedValueOnce(r))
const repo = 'https://api.github.com/repos/owner/repo'
const graphql = 'https://api.github.com/graphql'
const marker = 'content/news/yarisma-x/index.yaml'
const files = [
  { path: 'content/news/yarisma-x/tr.mdx', content: 'Yeni yarışma: İstanbul' },
  { path: 'content/news/yarisma-x/en.mdx', content: 'two' },
  { path: marker, content: 'three' },
]
const committed = (oid: string) => ok({ data: { createCommitOnBranch: { commit: { oid } } } })
const refused = (...errors: { type?: string; message: string }[]) => ok({ data: { createCommitOnBranch: null }, errors })
const stale = (head: string) => refused({ type: 'STALE_DATA', message: `Expected branch to point to "${head}" but it did not. Pull and try again.` })
/** GitHub's answers to the three calls of one attempt that lands (head<n> is main's head), cut to the first `upTo`. */
const attempt = (n: number, upTo = 3) =>
  [
    ok({ object: { sha: `head${n}` } }), // GET ref
    new Response('', { status: 404 }), // GET the marker at that head: not there
    committed(`commit${n}`), // POST GraphQL createCommitOnBranch
  ].slice(0, upTo)
/** The GraphQL input sent by call number `i`. */
const input = (i: number) => JSON.parse(String(fetchMock.mock.calls[i][1].body)).variables.input

describe('commitFiles', () => {
  it('commits all files at once: head, marker check at that head, then one GraphQL commit that only applies at that head', async () => {
    script(...attempt(1))
    expect(await commitFiles(files, 'msg', marker)).toBe('ok')

    const calls = fetchMock.mock.calls
    expect(calls.map(([, init]) => init.method ?? 'GET')).toEqual(['GET', 'GET', 'POST'])
    expect(calls.map(([url]) => url)).toEqual([`${repo}/git/ref/heads/main`, `${repo}/contents/${marker}?ref=head1`, graphql])
    for (const i of [0, 1]) expect(calls[i][1]).toMatchObject({ cache: 'no-store', headers: { authorization: 'Bearer test-token' } })
    expect(calls[2][1].headers).toMatchObject({ authorization: 'Bearer test-token', 'content-type': 'application/json' })
    expect(JSON.parse(String(calls[2][1].body)).query).toContain('createCommitOnBranch')
    const { fileChanges, ...rest } = input(2)
    expect(rest).toEqual({
      branch: { repositoryNameWithOwner: 'owner/repo', branchName: 'main' },
      expectedHeadOid: 'head1',
      message: { headline: 'msg' },
    })
    const added = fileChanges.additions.map((a: { path: string; contents: string }) => ({ path: a.path, content: Buffer.from(a.contents, 'base64').toString('utf8') }))
    expect(added).toEqual(files)
  })

  it('splits a multi-line message into the GraphQL headline and body', async () => {
    script(...attempt(1))
    expect(await commitFiles(files, 'subject\n\nmore words\nline 2', marker)).toBe('ok')
    expect(input(2).message).toEqual({ headline: 'subject', body: 'more words\nline 2' })
  })

  it('skips the marker check when no path is given', async () => {
    script(...attempt(1).filter((_, i) => i !== 1))
    expect(await commitFiles(files, 'msg')).toBe('ok')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${repo}/git/ref/heads/main`, graphql])
  })

  it('returns "exists" without a GraphQL call when the marker is already at the head', async () => {
    script(ok({ object: { sha: 'head1' } }), ok({ sha: 'abc' }))
    expect(await commitFiles(files, 'msg', marker)).toBe('exists')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain(graphql)
  })

  it.each([
    ['a STALE_DATA error', { type: 'STALE_DATA', message: 'stale' }],
    ['an untyped "Expected branch to point to" message', { message: 'Expected branch to point to "head1" but it did not. Pull and try again.' }],
    ['an untyped "is at ... but expected" message', { message: 'Ref refs/heads/main is at head2 but expected head1' }],
  ])('starts over from the new head when GitHub says %s, checking the marker there again', async (_what, error) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    script(...attempt(1, 2), refused(error), ...attempt(2))
    expect(await commitFiles(files, 'msg', marker)).toBe('ok')

    const calls = fetchMock.mock.calls
    expect(calls).toHaveLength(6)
    expect(calls[3][0]).toBe(`${repo}/git/ref/heads/main`)
    expect(calls[4][0]).toBe(`${repo}/contents/${marker}?ref=head2`)
    expect(calls[5][0]).toBe(graphql)
    expect(input(2).expectedHeadOid).toBe('head1')
    expect(input(5).expectedHeadOid).toBe('head2')
    expect(log).not.toHaveBeenCalled() // losing a race once is normal
    log.mockRestore()
  })

  it('returns "exists" when the run that won the race left the marker on main (stale, then the marker at the new head)', async () => {
    script(...attempt(1, 2), stale('head1'), ok({ object: { sha: 'head2' } }), ok({ sha: 'abc' }))
    expect(await commitFiles(files, 'msg', marker)).toBe('exists')
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('gives up with "conflict" after three stale attempts, logging the last GitHub message once', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    script(...[1, 2, 3].flatMap((n) => [...attempt(n, 2), stale(`head${n}`)]))
    expect(await commitFiles(files, 'msg', marker)).toBe('conflict')
    expect(fetchMock).toHaveBeenCalledTimes(9)
    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(
      'GitHub GraphQL createCommitOnBranch → STALE_DATA (conflict)',
      'Expected branch to point to "head3" but it did not. Pull and try again.',
    )
    error.mockRestore()
  })

  it.each([
    ['STALE_DATA', 'conflict'],
    ['FORBIDDEN', 'error'],
  ] as const)('never says "ok" for a GraphQL reply with a %s error, even when it also names a commit', async (type, expected) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // A commit sha in the reply (say, an identical commit another run made) is not proof that this run's commit was accepted.
    const named = () => ok({ data: { createCommitOnBranch: { commit: { oid: 'same' } } }, errors: [{ type, message: 'refused' }] })
    script(...[1, 2, 3].flatMap((n) => [...attempt(n, 2), named()]))
    expect(await commitFiles(files, 'msg', marker)).toBe(expected)
    error.mockRestore()
  })

  it('lets exactly one of two concurrent runs commit: the other is refused as stale, retries, finds the marker and gets "exists"', async () => {
    // A tiny GitHub: main's head, the paths at each head, and createCommitOnBranch applying only at the head it expects.
    let head = 'head0'
    const paths: Record<string, string[]> = { head0: [] }
    fetchMock.mockImplementation(async (url: string, init?: { body?: string }) => {
      if (url.endsWith('/git/ref/heads/main')) return ok({ object: { sha: head } })
      if (url.includes('/contents/')) return paths[new URL(url).searchParams.get('ref') ?? ''].includes(marker) ? ok({ sha: 'abc' }) : new Response('', { status: 404 })
      const { expectedHeadOid, fileChanges } = JSON.parse(String(init?.body)).variables.input
      if (expectedHeadOid !== head) return stale(expectedHeadOid)
      const next = `head${Object.keys(paths).length}`
      paths[next] = [...paths[head], ...fileChanges.additions.map((a: { path: string }) => a.path)]
      head = next
      return committed(next)
    })
    const results = await Promise.all([commitFiles(files, 'msg', marker), commitFiles(files, 'msg', marker)])
    expect(results.sort()).toEqual(['exists', 'ok'])
    expect(Object.keys(paths)).toEqual(['head0', 'head1']) // one commit landed
  })

  it("logs GitHub's message and returns \"error\" for a GraphQL error that is not staleness", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    script(...attempt(1, 2), refused({ type: 'FORBIDDEN', message: 'Resource not accessible by personal access token' }))
    expect(await commitFiles(files, 'msg', marker)).toBe('error')
    expect(fetchMock).toHaveBeenCalledTimes(3) // no second attempt
    expect(error).toHaveBeenCalledWith('GitHub GraphQL createCommitOnBranch → FORBIDDEN', 'Resource not accessible by personal access token')
    error.mockRestore()
  })

  it('returns "error" when the GraphQL reply has neither errors nor a commit', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    script(...attempt(1, 2), ok({ data: { createCommitOnBranch: null } }))
    expect(await commitFiles(files, 'msg', marker)).toBe('error')
    expect(error).toHaveBeenCalledWith('GitHub GraphQL createCommitOnBranch → 200', '{"data":{"createCommitOnBranch":null}}')
    error.mockRestore()
  })

  it.each([
    ['GET git/ref/heads/main', 0],
    [`GET ${marker}`, 1],
    ['GraphQL createCommitOnBranch', 2],
  ])('logs "GitHub %s → 500" and returns "error" without going on when that call fails', async (step, i) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    script(...attempt(1, i), new Response('boom', { status: 500 }))
    expect(await commitFiles(files, 'msg', marker)).toBe('error')
    expect(fetchMock).toHaveBeenCalledTimes(i + 1)
    expect(error).toHaveBeenCalledWith(`GitHub ${step} → 500`, 'boom')
    error.mockRestore()
  })

  it('development without a token only logs what it would commit', async () => {
    vi.stubEnv('GITHUB_TOKEN', '')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await commitFiles(files, 'msg', marker)).toBe('ok')
    expect(log).toHaveBeenCalledWith('[github:dev] would commit', 'msg', files.map((f) => f.path))
    expect(fetchMock).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('readRepoFile', () => {
  it('decodes the file on main with its sha, and returns null for 404', async () => {
    const content = Buffer.from('{"sent":[]}\n', 'utf8').toString('base64')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content, sha: 'abc' }), { status: 200 }))
    expect(await readRepoFile('content/newsletter-log.json')).toEqual({ text: '{"sent":[]}\n', sha: 'abc' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/owner/repo/contents/content/newsletter-log.json?ref=main')
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    expect(await readRepoFile('x.json')).toBeNull()
  })
})

describe('writeRepoFile', () => {
  it('writes with the sha it read and maps GitHub conflicts', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    expect(await writeRepoFile('a.json', 'x', 'msg', 'abc')).toBe('ok')
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body).toEqual({ message: 'msg', content: Buffer.from('x').toString('base64'), branch: 'main', sha: 'abc' })
    expect(error).not.toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    expect(await writeRepoFile('a.json', 'x', 'msg', 'old')).toBe('conflict')
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }))
    expect(await writeRepoFile('a.json', 'x', 'msg', null)).toBe('conflict')
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    expect(await writeRepoFile('a.json', 'x', 'msg', 'abc')).toBe('error')
    error.mockRestore()
  })

  it('logs the status and GitHub\'s message for a conflict, so a persistent refusal (a ruleset, a bad sha) is not silent', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(new Response('{"message":"a.json does not match abc"}', { status: 409 }))
    expect(await writeRepoFile('a.json', 'x', 'msg', 'old')).toBe('conflict')
    expect(error).toHaveBeenCalledWith('GitHub PUT a.json → 409 (conflict)', '{"message":"a.json does not match abc"}')
    fetchMock.mockResolvedValueOnce(new Response('{"message":"Invalid request. \\"sha\\" wasn\'t supplied."}', { status: 422 }))
    expect(await writeRepoFile('b.json', 'x', 'msg', null)).toBe('conflict')
    expect(error).toHaveBeenLastCalledWith('GitHub PUT b.json → 422 (conflict)', '{"message":"Invalid request. \\"sha\\" wasn\'t supplied."}')
    error.mockRestore()
  })
})

describe('missing configuration', () => {
  it('production without a token throws an error named GitHubConfigMissing, so the log says what is wrong', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('GITHUB_TOKEN', '')
    await expect(fileExists('x.yaml')).rejects.toMatchObject({ name: 'GitHubConfigMissing' })
    await expect(readRepoFile('x.json')).rejects.toMatchObject({ name: 'GitHubConfigMissing' })
    await expect(writeRepoFile('x.json', 'x', 'msg', null)).rejects.toMatchObject({ name: 'GitHubConfigMissing' })
    await expect(commitFiles(files, 'msg', marker)).rejects.toMatchObject({ name: 'GitHubConfigMissing' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
