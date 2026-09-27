// scripts/rankings-data.ts: pnpm data:rankings [--force] [--from-dir <dir>] [--out <dir>]
// Official WCA Results Export (TSV) → data/rankings (full rankings spec §4). The daily workflow runs the same command.
import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { buildRankings, exportMajor, RANKING_FILES, serializeRows, shrinkViolations } from '@/lib/rankings-export'
import { WCA_BASE, WCA_UA } from '@/lib/wca/client'

type PublicExport = { export_date: string; export_version: string; tsv_url: string }
type Meta = { exportDate: string; formatVersion: string }

const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const force = args.includes('--force')
const fromDir = option('--from-dir')
const outDir = path.resolve(option('--out') ?? 'data/rankings')
const metaFile = path.join(outDir, 'meta.json')

/** metadata.json inside the export: { export_date, export_format_version }. */
function exportMetadata(dir: string): Meta {
  const m = JSON.parse(readFileSync(path.join(dir, 'metadata.json'), 'utf8')) as { export_date: string; export_format_version: string }
  // The export writes "YYYY-MM-DD HH:MM:SS UTC"; normalize to the API's "YYYY-MM-DDTHH:MM:SSZ" so meta.json matches it.
  return { exportDate: m.export_date.replace(' ', 'T').replace(' UTC', 'Z'), formatVersion: m.export_format_version }
}

async function latestExport(): Promise<PublicExport> {
  const res = await fetch(`${WCA_BASE}/api/v0/export/public`, { headers: { 'User-Agent': WCA_UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Dışa aktarım bilgisi alınamadı: HTTP ${res.status}`)
  const pub = (await res.json()) as PublicExport
  if (exportMajor(pub.export_version) !== 2) throw new Error(`Beklenmeyen dışa aktarım sürümü ${pub.export_version}; betiği gözden geçir.`)
  return pub
}

async function download(url: string, file: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': WCA_UA } })
  if (!res.ok || !res.body) throw new Error(`İndirme başarısız: HTTP ${res.status} ${url}`)
  await pipeline(Readable.fromWeb(res.body as unknown as NodeReadableStream), createWriteStream(file))
}

/** Only the three files we read (the whole export unpacks to several GB): `unzip`, or bsdtar (`tar`) on Windows. */
function extract(zip: string, dir: string): void {
  const members = ['*metadata.json', '*persons.tsv', '*results.tsv']
  let run = spawnSync('unzip', ['-o', '-j', zip, ...members, '-d', dir], { stdio: 'inherit' })
  if ((run.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
    run = spawnSync('tar', ['-xf', zip, '-C', dir, ...members], { stdio: 'inherit' })
  }
  if (run.status !== 0) throw new Error(`Zip açılamadı: ${run.error?.message ?? `çıkış kodu ${run.status}`}`)
}

/** Transform, refuse a shrinking ranking, then write all 31 files and meta.json (meta last). */
async function writeRankings(dir: string, meta: Meta): Promise<void> {
  if (exportMajor(meta.formatVersion) !== 2) throw new Error(`Beklenmeyen dışa aktarım sürümü ${meta.formatVersion}; betiği gözden geçir.`)
  const next = await buildRankings(dir)
  const previous = new Map<string, number>()
  for (const f of RANKING_FILES) {
    const file = path.join(outDir, `${f.key}.json`)
    if (existsSync(file)) previous.set(f.key, (JSON.parse(readFileSync(file, 'utf8')) as unknown[]).length)
  }
  const shrunk = shrinkViolations(previous, new Map([...next].map(([key, rows]) => [key, rows.length])))
  if (shrunk.length > 0) throw new Error(`Sıralamalar %10'dan fazla küçüldü, dosyalar yazılmadı:\n${shrunk.join('\n')}`)
  for (const type of ['single', 'average']) mkdirSync(path.join(outDir, type), { recursive: true })
  for (const [key, rows] of next) writeFileSync(path.join(outDir, `${key}.json`), serializeRows(rows))
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`${meta.exportDate} tarihli dışa aktarım yazıldı:`)
  for (const [key, rows] of next) console.log(`  ${key}: ${rows.length}`)
}

async function main(): Promise<void> {
  if (fromDir) return writeRankings(fromDir, exportMetadata(fromDir))
  const pub = await latestExport()
  const current = existsSync(metaFile) ? (JSON.parse(readFileSync(metaFile, 'utf8')) as Meta) : null
  if (!force && current?.exportDate === pub.export_date) {
    console.log(`Veri güncel (${pub.export_date}).`)
    return
  }
  const temp = mkdtempSync(path.join(tmpdir(), 'wca-export-'))
  try {
    console.log(`İndiriliyor: ${pub.tsv_url}`)
    await download(pub.tsv_url, path.join(temp, 'export.zip'))
    extract(path.join(temp, 'export.zip'), temp)
    // meta.json keeps the API's export_date, which the next run compares against.
    await writeRankings(temp, { exportDate: pub.export_date, formatVersion: exportMetadata(temp).formatVersion })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

main().catch((err: unknown) => {
  const cause = err instanceof Error && err.cause ? ` (${err.cause instanceof Error ? err.cause.message : String(err.cause)})` : ''
  console.error(err instanceof Error ? `${err.message}${cause}` : err)
  process.exit(1)
})
