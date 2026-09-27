// lib/content-check.test.ts
import { describe, expect, it } from 'vitest'
import { assetError, bodyImagePaths, MAX_ASSET_BYTES, mdxBodyErrors, readerErrorTr } from '@/lib/content-check'

describe('mdxBodyErrors', () => {
  it('accepts the site components, markdown, entities and the escapes the editor writes', () => {
    const body = [
      '## Başlık',
      '',
      'Metin <DataController field="email" /> ve [bağlantı](/kvkk) ve <MdxLink href="/kvkk" locale="tr">metin</MdxLink>.',
      '',
      '<Anchor id="bulten" />',
      '',
      '<Details summary="Soru?">',
      '',
      'Cevap &lt;2026&gt; &#123;x&#125;, Cube \\<2026> \\{Open} ve 3 < 5',
      '',
      '</Details>',
      '',
      '## <Lang code="en">Speedcubing</Lang> nedir?',
      '',
      // Inline code is literal for both the panel and the site: `<h2 id>`, `{x}`, and a double-backtick span with a ` inside
      'Kod: `<h2 id="x">`, `{x}` ve ``a ` <b> {y}`` burada.',
      '',
    ].join('\n')
    expect(mdxBodyErrors(body, 'f.mdx')).toEqual([])
  })

  it('flags raw HTML, unknown components, an unescaped < before a character and an unescaped { with the file and line', () => {
    const h2 = mdxBodyErrors('<h2 id="x">a</h2>\n', 'content/tr/pages/kvkk.mdx')
    expect(h2).toHaveLength(2)
    expect(h2[0]).toContain('content/tr/pages/kvkk.mdx:1: "<h2" panelin açamayacağı ham HTML ya da tanımsız bileşen')
    expect(mdxBodyErrors('a\n<Foo bar="1" />\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:2: "<Foo"')])
    expect(mdxBodyErrors('Cube <2026>\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "<"')])
    expect(mdxBodyErrors('a <= b\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "<"')])
    expect(mdxBodyErrors('Cube {Open}\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "{"')])
    // outside the code span the scan goes on, and an escaped backtick opens none
    expect(mdxBodyErrors('`<b>` sonra <div>\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "<div"')])
    expect(mdxBodyErrors('\\`<b>\\`\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "<b"')])
    // MDX has no <…> autolinks: the panel's parser and the site's compile both stop at "<https:" (a tag with a bad name)
    expect(mdxBodyErrors('Adres: <https://example.com>\n', 'f.mdx')).toEqual([expect.stringContaining('f.mdx:1: "<https"')])
  })

  it('ignores fenced code', () => {
    expect(mdxBodyErrors('```\n<div>{x}</div>\n```\n', 'f.mdx')).toEqual([])
  })
})

describe('bodyImagePaths', () => {
  it('lists local image paths referenced by markdown images', () => {
    expect(bodyImagePaths('a ![Podyum](/images/news/podyum.jpg) b ![x](https://example.com/x.png) ![](/images/news/y.webp)')).toEqual([
      '/images/news/podyum.jpg',
      '/images/news/y.webp',
    ])
    expect(bodyImagePaths('no images')).toEqual([])
  })
})

describe('assetError', () => {
  it('reports a missing file and a file over 5 MB in Turkish, otherwise null', () => {
    expect(assetError('content/home/slides.json (slayt "brand")', '/images/slides/a.jpg', null)).toBe('content/home/slides.json (slayt "brand"): dosya yok: public/images/slides/a.jpg')
    expect(assetError('f', '/galeri/b.jpg', MAX_ASSET_BYTES + 1)).toBe('f: public/galeri/b.jpg 5.0 MB; sınır 5 MB, görseli küçült')
    expect(assetError('f', '/galeri/b.jpg', 7 * 1024 * 1024)).toContain('7.0 MB')
    expect(assetError('f', '/galeri/b.jpg', MAX_ASSET_BYTES)).toBeNull()
    expect(MAX_ASSET_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('readerErrorTr', () => {
  it('turns the reader error into one Turkish line per field, prefixed with the file', () => {
    const e = new Error('Invalid data for singleton "site":\ndataController.email: E-posta must not be empty\n: Key on object value "x" is not allowed')
    expect(readerErrorTr(e, 'content/site.json')).toBe(
      'content/site.json: panel şemasına uymuyor:\n    dataController.email: E-posta must not be empty\n    kök: Key on object value "x" is not allowed',
    )
    expect(readerErrorTr(new Error('Entry "x" not found in collection "news"'), 'content/news/x/index.yaml')).toBe(
      'content/news/x/index.yaml: panel şemasına uymuyor: Entry "x" not found in collection "news"',
    )
    expect(readerErrorTr('boom', 'f')).toBe('f: panel şemasına uymuyor: boom')
  })
})
