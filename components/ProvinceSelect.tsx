'use client'

import { useRouter } from 'next/navigation'

type Props = {
  id: string
  /** the chosen province's slug, '' for all of Türkiye */
  value: string
  /** the rankings page's localized path */
  action: string
  /** the query a new province keeps (the page size) */
  keep: Record<string, string>
  allLabel: string
  options: { value: string; label: string }[]
}

/** The rankings panel's province choice (2026-10-21): picking one applies it at once, without a button. "Tüm Türkiye"
 *  leaves ?il out of the address. Without JS its form's own button does the same. */
export function ProvinceSelect({ id, value, action, keep, allLabel, options }: Props) {
  const router = useRouter()
  return (
    <select
      id={id}
      name="il"
      defaultValue={value}
      onChange={(e) => {
        const query = new URLSearchParams({ ...keep, ...(e.target.value ? { il: e.target.value } : {}) }).toString()
        router.push(query ? `${action}?${query}` : action)
      }}
      className="h-11 w-full appearance-none border border-line bg-bg px-3 pr-10 text-fg focus:border-fg"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
