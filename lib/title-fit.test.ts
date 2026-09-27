import { describe, expect, it } from 'vitest'
import { titleFit } from './title-fit'

describe('titleFit', () => {
  it('gives the em budget of the longest word: up to 11 letters 10.5em, up to 14 letters 13.4em, longer 16.2em', () => {
    expect(titleFit('Speedcubing Türkiye')).toBe(10.5) // SPEEDCUBING, 11
    expect(titleFit('Competition photography')).toBe(10.5) // PHOTOGRAPHY, 11 (10.31em, the widest measured)
    expect(titleFit('Organizasyon')).toBe(13.4) // 12
    expect(titleFit('Şampiyonalarda yarış')).toBe(13.4) // 14
    expect(titleFit('Bildirebilirsiniz')).toBe(16.2) // 17
  })

  it('measures the parts of a hyphenated word, since a line may break after the hyphen', () => {
    expect(titleFit('Yarışma-organizasyon')).toBe(13.4) // "organizasyon", 12, not the 20-letter whole
  })
})
