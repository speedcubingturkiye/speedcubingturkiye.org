// lib/title-fit.ts: hero slide titles (R7): no word may split, and the team now writes the titles in the panel. The
// carousel sizes a title so its longest word fits the title's column; this picks that word's width budget in em, by
// letter count. Measured in Archivo 800 at width 125, uppercase: SPEEDCUBING (11 letters) 9.58em, PHOTOGRAPHY (11)
// 10.31em, ORGANİZASYON (12) 10.75em, RECOMMENDATION (14) 12.81em; the widest per letter was WONDERWORKING at 0.949em.
// Each tier allows 0.955em a letter for its longest word; past that the heading's overflow-wrap is the last resort.

/** Em width budget for the longest word of a title: up to 11 letters 10.5em, up to 14 letters 13.4em, longer 16.2em. */
export function titleFit(title: string): 10.5 | 13.4 | 16.2 {
  // A line may break after a hyphen, so each part of a hyphenated word is measured on its own
  const longest = Math.max(...title.split(/[\s-]+/).map((word) => word.length))
  return longest <= 11 ? 10.5 : longest <= 14 ? 13.4 : 16.2
}
