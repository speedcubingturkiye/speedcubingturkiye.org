// components/FollowBand.tsx: homepage closing red band: social links + newsletter (spec §4.3)
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { activeChannels, site } from '@/site.config'
import { ChannelIcon, hasChannelIcon } from '@/components/ChannelIcon'
import { NewsletterForm } from '@/components/NewsletterForm'

export async function FollowBand({ locale }: { locale: Locale }) {
  const t = await getTranslations('home')
  const channels = activeChannels() // empty channels are hidden by site.config
  return (
    // White focus ring: the global red outline is invisible on red (as in the hero)
    <section id="bulten-kayit" className="bg-brand text-white [&_:focus-visible]:outline-white" aria-labelledby="follow-title">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
        <div>
          <h2 id="follow-title">{t('followTitle')}</h2>
          <p className="mt-3 max-w-md">{t('followText')}</p>
          {channels.length > 0 && (
            // The marks themselves are the links: 44px targets around 28px marks, pulled 8px left so the first mark lines
            // up with the text above
            <ul className="mt-6 -ml-2 flex flex-wrap gap-2">
              {channels.map(([key, label]) => {
                const icon = hasChannelIcon(key)
                return (
                  <li key={key}>
                    {/* English brand names: lang keeps the uppercase label from dotting the i (DISCORD, not DİSCORD).
                        A mark is named by aria-label; a channel without one shows its name. */}
                    <a
                      href={site.channels[key]}
                      rel="noopener noreferrer"
                      target="_blank"
                      lang="en"
                      aria-label={icon ? label : undefined}
                      className={
                        icon
                          ? 'inline-flex h-11 w-11 items-center justify-center hover:text-white/75'
                          : 't-label inline-flex h-11 items-center px-2 hover:text-white/75'
                      }
                    >
                      {icon ? <ChannelIcon channel={key} size={28} /> : label}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <h2>{t('followNewsletter')}</h2>
          <div className="mt-4">
            <NewsletterForm locale={locale} tone="on-brand" />
          </div>
        </div>
      </div>
    </section>
  )
}
