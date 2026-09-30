// app/[locale]/error.tsx: shown in place of the page when rendering it throws; the layout with the header and the
// footer stays. Same frame as not-found.tsx. retry() (Next 16) fetches and renders the page again.
'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function ErrorPage({ retry }: { retry: () => void }) {
  const t = useTranslations('common')
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      {/* The logo's square turned 45°, as a warning sign */}
      <div aria-hidden="true" className="mx-auto grid size-14 rotate-45 place-items-center border-2 border-brand-ink">
        <span className="-rotate-45 text-2xl font-extrabold text-brand-ink">!</span>
      </div>
      <h1 className="mt-10">{t('errorTitle')}</h1>
      <p className="mt-3 text-fg-2">{t('errorText')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-brand">
          {t('errorRetry')}
        </button>
        <Link href="/" className="btn btn-outline">
          {t('notFoundCta')}
        </Link>
      </div>
    </div>
  )
}
