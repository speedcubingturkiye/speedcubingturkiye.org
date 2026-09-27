import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { site } from '@/site.config'
import { Callout } from '@/components/Callout'
import { Details } from '@/components/Details'

// Internal links ("/kvkk") become locale-aware next-intl Links, following the current locale;
// external ones open in a new tab. Markdown-syntax links ("[text](/kvkk)") route through here
// automatically. For the rare deliberate cross-locale reference, use this component directly in
// MDX as `<MdxLink href="/kvkk" locale="tr">...</MdxLink>` (a plain `<a locale="tr">` would NOT
// work: literal lowercase JSX tags in MDX bypass the `components` map); same pattern as the
// `locale` prop on components/LangSwitch.tsx's Link.
export function MdxLink({ href = '', children, locale, ...rest }: ComponentPropsWithoutRef<'a'> & { locale?: Locale }) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} locale={locale} {...rest}>
        {children}
      </Link>
    )
  }
  const external = /^https?:\/\//.test(href)
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
    </a>
  )
}

// <DataController /> in MDX renders the KVKK data controller from site.config.
export function DataController({ field }: { field?: 'name' | 'email' }) {
  const { name, email } = site.dataController
  const mail = <a href={`mailto:${email}`}>{email}</a>
  if (field === 'name') return <strong>{name}</strong>
  if (field === 'email') return mail
  return (
    <span>
      <strong>{name}</strong> · {mail}
    </span>
  )
}

// <Lang code="en">Speedcubing</Lang>: a word in the other language inside CSS-uppercased text (R8: TÜRKİYE, SPEEDCUBING).
export function Lang({ code, children }: { code: 'tr' | 'en'; children: ReactNode }) {
  return <span lang={code}>{children}</span>
}

// <Anchor id="bulten" />: an in-page link target placed right above a heading (/kvkk#bulten). Any [id] gets
// scroll-margin-top in globals.css, so the target lands below the sticky header.
export function Anchor({ id }: { id: string }) {
  return <div id={id} />
}

export const mdxComponents = { Details, Callout, DataController, MdxLink, Anchor, Lang, a: MdxLink }
