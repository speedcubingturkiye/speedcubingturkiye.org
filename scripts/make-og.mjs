// Usage: node scripts/make-og.mjs [path/to/logo.png]  → writes public/og.png (1200×630)
import sharp from 'sharp'

const src = process.argv[2] ?? 'public/brand/logo-mark.png'
const W = 1200
const H = 630

const logo = await sharp(src).resize({ width: 480, height: 420, fit: 'inside' }).png().toBuffer()
const { width, height } = await sharp(logo).metadata()

await sharp({ create: { width: W, height: H, channels: 4, background: '#FFFFFF' } })
  .composite([{ input: logo, left: Math.round((W - width) / 2), top: Math.round((H - height) / 2) }])
  .png()
  .toFile('public/og.png')

console.log(`public/og.png written (${W}x${H}, logo ${width}x${height})`)
