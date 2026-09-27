// lib/github.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileExists, putFiles, readRepoFile, writeRepoFile } from '@/lib/github'

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

// fileExists and putFiles are what the announce cron commits through: pinned here so the shared GET/PUT stays put.
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

describe('putFiles', () => {
  it('commits each file with its own GET then PUT, sending the sha only for a file that exists', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'abc' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const files = [
      { path: 'content/news/yarisma-x/tr.mdx', content: 'one' },
      { path: 'content/news/yarisma-x/index.yaml', content: 'two' },
    ]
    expect(await putFiles(files, 'msg')).toBe(true)

    const calls = fetchMock.mock.calls
    expect(calls).toHaveLength(4)
    expect(calls.map(([, init]) => init.method ?? 'GET')).toEqual(['GET', 'PUT', 'GET', 'PUT'])
    const base = 'https://api.github.com/repos/owner/repo/contents/content/news/yarisma-x'
    expect(calls.map(([url]) => url)).toEqual([`${base}/tr.mdx?ref=main`, `${base}/tr.mdx`, `${base}/index.yaml?ref=main`, `${base}/index.yaml`])
    expect(calls[1][1].headers).toMatchObject({ authorization: 'Bearer test-token', 'content-type': 'application/json' })
    const first = JSON.parse(String(calls[1][1].body))
    expect(first).toEqual({ message: 'msg', content: Buffer.from('one').toString('base64'), branch: 'main' })
    expect(first).not.toHaveProperty('sha')
    const second = JSON.parse(String(calls[3][1].body))
    expect(second).toEqual({ message: 'msg', content: Buffer.from('two').toString('base64'), branch: 'main', sha: 'abc' })
  })

  it('logs the status and returns false at the first file GitHub refuses', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const files = [
      { path: 'content/news/yarisma-y/tr.mdx', content: 'one' },
      { path: 'content/news/yarisma-y/index.yaml', content: 'two' },
    ]
    expect(await putFiles(files, 'msg')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2) // the second file is never tried
    expect(error).toHaveBeenCalledWith('GitHub PUT content/news/yarisma-y/tr.mdx → 500', 'boom')
    error.mockRestore()
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
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
