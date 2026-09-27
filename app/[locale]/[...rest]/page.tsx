// app/[locale]/[...rest]/page.tsx: unmatched paths (e.g. /nope → /tr/nope) would otherwise get Next's bare
// global 404; calling notFound() here renders app/[locale]/not-found.tsx inside the localized root layout.
import { notFound } from 'next/navigation'

export default function CatchAll() {
  notFound()
}
