// components/Footer.tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { activeChannels, site } from '@/site.config'
import { ChannelIcon, hasChannelIcon } from '@/components/ChannelIcon'
import { Logo } from '@/components/Logo'

export async function Footer() {
  const t = await getTranslations('footer')
  const nav = await getTranslations('nav')
  const common = await getTranslations('common')
  const legalT = await getTranslations('legal')
  const channels = activeChannels()
  // Channels with a mark share one row of icons; the others stay text links
  const iconChannels = channels.filter(([key]) => hasChannelIcon(key))
  const textChannels = channels.filter(([key]) => !hasChannelIcon(key))

  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: t('competitions'),
      links: [
        ['/yarismalar', nav('calendar')],
        ['/yarismalar/ilk-yarismam', nav('firstCompetition')],
        ['/yarismalar/sss', nav('faq')],
        ['/yarismalar/ebeveynler-icin', nav('forParents')],
        ['/siralamalar', nav('rankings')],
      ],
    },
    {
      title: t('community'),
      links: [
        ['/haberler', nav('news')],
        ['/medya', nav('media')],
        ['/organizasyon/gonullu-ol', nav('volunteer')],
      ],
    },
    {
      title: t('organization'),
      links: [
        ['/organizasyon', nav('about')],
        ['/organizasyon/tuzuk', nav('bylaws')],
        ['/organizasyon/belgeler', nav('documents')],
        ['/organizasyon/ilanlar', nav('announcements')],
        ['/organizasyon/guvenli-ortam', nav('safeguarding')],
      ],
    },
  ]

  const legal: [string, string][] = [
    ['/kvkk', nav('privacy')],
    ['/cerez-politikasi', nav('cookies')],
    ['/organizasyon/goruntu-bildirimi', nav('filmingNotice')],
  ]

  const link = 'text-sm text-white/80 hover:text-white'

  return (
    <footer className="bg-ink-band text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div aria-hidden="true">
          <Logo variant="long" tone="inverted" className="h-8 w-auto" />
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="t-label text-white/60">{col.title}</h2>
              <ul className="mt-3 space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className={link}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="t-label text-white/60">{t('contact')}</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/iletisim" className={link}>
                  {nav('contact')}
                </Link>
              </li>
              <li>
                <a href={`mailto:${site.contactEmail}`} className={link}>
                  {site.contactEmail}
                </a>
              </li>
              <li>
                {/* plain <a>: /wca is a next.config redirect, must not get the /en prefix a next-intl Link would add */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/wca" className={link}>
                  {nav('wca')}
                </a>
              </li>
              {textChannels.map(([key, label]) => (
                <li key={key}>
                  <a href={site.channels[key]} rel="noopener noreferrer" target="_blank" className={link}>
                    {label}
                  </a>
                </li>
              ))}
              {iconChannels.length > 0 && (
                // 36px targets around the 20px marks, pulled 8px left so the first mark lines up with the text above
                <li className="-ml-2 flex">
                  {iconChannels.map(([key, label]) => (
                    <a
                      key={key}
                      href={site.channels[key]}
                      rel="noopener noreferrer"
                      target="_blank"
                      lang="en"
                      aria-label={label}
                      className="inline-flex h-9 w-9 items-center justify-center text-white/80 hover:text-white"
                    >
                      <ChannelIcon channel={key} />
                    </a>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-1">
            <p>{common('unofficialNote')}</p>
            <p>{legalT('wcaDisclaimer')}</p>
            <p>
              {t('dataController')}: {site.dataController.name} ·{' '}
              <a href={`mailto:${site.dataController.email}`} className="underline hover:text-white">
                {site.dataController.email}
              </a>
            </p>
            <p>{t('rights', { year: new Date().getFullYear() })}</p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {legal.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="underline hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
