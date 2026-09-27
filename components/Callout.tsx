import type { ReactNode } from 'react'

// lang marks a box written in the other language (R8: CSS uppercase follows the nearest lang). The panel writes '' for
// "page language", which must not reach the DOM (lang="" means "unknown language").
export function Callout({ title, lang, children }: { title?: string; lang?: 'tr' | 'en' | ''; children: ReactNode }) {
  return (
    <aside lang={lang || undefined} className="my-6 border border-line bg-bg-2 px-4 py-3">
      {title && (
        <p className="flex items-center gap-2 font-semibold">
          <span className="sq text-brand" aria-hidden="true" />
          {title}
        </p>
      )}
      <div className="text-fg-2">{children}</div>
    </aside>
  )
}
