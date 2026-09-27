// lib/wca/records.ts
export const EVENTS: { id: string; name: { tr: string; en: string }; hasAverage: boolean }[] = [
  { id: '333', name: { tr: '3x3x3 Küp', en: '3x3x3 Cube' }, hasAverage: true },
  { id: '222', name: { tr: '2x2x2 Küp', en: '2x2x2 Cube' }, hasAverage: true },
  { id: '444', name: { tr: '4x4x4 Küp', en: '4x4x4 Cube' }, hasAverage: true },
  { id: '555', name: { tr: '5x5x5 Küp', en: '5x5x5 Cube' }, hasAverage: true },
  { id: '666', name: { tr: '6x6x6 Küp', en: '6x6x6 Cube' }, hasAverage: true },
  { id: '777', name: { tr: '7x7x7 Küp', en: '7x7x7 Cube' }, hasAverage: true },
  { id: '333bf', name: { tr: '3x3x3 Gözü Kapalı', en: '3x3x3 Blindfolded' }, hasAverage: true },
  { id: '333fm', name: { tr: '3x3x3 En Az Hamle', en: '3x3x3 Fewest Moves' }, hasAverage: true },
  { id: '333oh', name: { tr: '3x3x3 Tek El', en: '3x3x3 One-Handed' }, hasAverage: true },
  { id: 'clock', name: { tr: 'Clock', en: 'Clock' }, hasAverage: true },
  { id: 'minx', name: { tr: 'Megaminx', en: 'Megaminx' }, hasAverage: true },
  { id: 'pyram', name: { tr: 'Pyraminx', en: 'Pyraminx' }, hasAverage: true },
  { id: 'skewb', name: { tr: 'Skewb', en: 'Skewb' }, hasAverage: true },
  { id: 'sq1', name: { tr: 'Square-1', en: 'Square-1' }, hasAverage: true },
  { id: '444bf', name: { tr: '4x4x4 Gözü Kapalı', en: '4x4x4 Blindfolded' }, hasAverage: false },
  { id: '555bf', name: { tr: '5x5x5 Gözü Kapalı', en: '5x5x5 Blindfolded' }, hasAverage: false },
  { id: '333mbf', name: { tr: '3x3x3 Çoklu Gözü Kapalı', en: '3x3x3 Multi-Blind' }, hasAverage: false },
]

/** 'en' for a name that is the same in both languages (Clock, Megaminx, Pyraminx, Skewb, Square-1): an English product
 *  name, which CSS uppercase must not dot on a Turkish page (MEGAMINX, not MEGAMİNX; R8). */
export function eventNameLang(id: string): 'en' | undefined {
  const e = EVENTS.find((x) => x.id === id)
  return e && e.name.tr === e.name.en ? 'en' : undefined
}
