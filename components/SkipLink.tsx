// components/SkipLink.tsx
import { useTranslations } from 'next-intl'

export function SkipLink() {
  const t = useTranslations('common')
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-brand focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
    >
      {t('skipToContent')}
    </a>
  )
}
