// components/DataUnavailable.tsx
import { useTranslations } from 'next-intl'

/** "Veri şu an alınamıyor. / WCA'da gör" box shared by the calendar, the rankings pages and the homepage. */
export function DataUnavailable({ href }: { href: string }) {
  const t = useTranslations('common')
  return (
    <div role="status" className="border border-line bg-bg-2 p-6 text-center">
      <p className="font-semibold">{t('dataUnavailable')}</p>
      <a href={href} rel="noopener noreferrer" target="_blank" className="mt-2 inline-block font-semibold text-brand-ink underline">
        {t('dataUnavailableCta')}
      </a>
    </div>
  )
}
