// lib/slug.ts: one slug rule for the panel (the news slug field) and the cron (lib/announce.ts): Turkish letters are
// transliterated, every run of other characters outside [a-z0-9] becomes one hyphen (spec §3.1).
const TR: Record<string, string> = { ı: 'i', İ: 'i', I: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' }

export function trSlug(title: string): string {
  return title
    .replace(/[ıİIşŞğĞüÜöÖçÇ]/g, (c) => TR[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
