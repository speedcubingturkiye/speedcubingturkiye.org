import type { ReactNode } from 'react'

export function Details({ id, summary, icon, children }: { id?: string; summary: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <details id={id} className="accordion my-3 border border-line bg-bg-2 px-4 py-3">
      {/* An icon, when given, takes the triangle's place */}
      <summary className={icon ? 'cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden' : 'cursor-pointer font-semibold marker:text-brand'}>
        {icon}
        {summary}
      </summary>
      {/* The body grows on opening and shrinks on closing (accordion in globals.css) */}
      <div className="accordion-body">
        <div>
          {/* Edge margins trimmed: the clipping wrapper keeps them from collapsing into the 12px gap */}
          <div className="pt-3 text-fg-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
        </div>
      </div>
    </details>
  )
}
