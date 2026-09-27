// app/[locale]/not-found.tsx: rendered when notFound() is thrown under [locale] (e.g. unknown competition id)
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  const t = useTranslations('common')
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-ink">404</p>
      <h1 className="mt-4">{t('notFoundTitle')}</h1>
      <p className="mt-3 text-fg-2">{t('notFoundText')}</p>
      <Link href="/" className="btn btn-brand mt-8">
        {t('notFoundCta')}
      </Link>
    </div>
  )
}
