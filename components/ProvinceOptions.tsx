// components/ProvinceOptions.tsx: a city list's choices (2026-10-22), for the Üye ol and Hesabım forms (MemberFields)
// and the rankings panel (RankingsParts): the five most chosen first, then the 81 in order, then Yurt dışı. No 'use
// client': it renders where its select does.
import { ABROAD, POPULAR_PROVINCES, PROVINCE_CHOICES } from '@/lib/membership-rules'
import { provinceSlug } from '@/lib/wca/city'

/** `slugs`: the rankings' `?il=` values instead of the names the sheet keeps. */
export function ProvinceOptions({ slugs = false, popular, all, abroad }: { slugs?: boolean; popular: string; all: string; abroad: string }) {
  const value = (place: string) => (slugs ? provinceSlug(place) : place)
  const option = (place: string) => (
    <option key={place} value={value(place)}>
      {place}
    </option>
  )
  return (
    <>
      <optgroup label={popular}>{POPULAR_PROVINCES.map(option)}</optgroup>
      <optgroup label={all}>{PROVINCE_CHOICES.map(option)}</optgroup>
      <option value={value(ABROAD)}>{abroad}</option>
    </>
  )
}
