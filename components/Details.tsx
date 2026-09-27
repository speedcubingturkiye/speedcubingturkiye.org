import type { ReactNode } from 'react'

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="accordion my-3 border border-line bg-bg-2 px-4 py-3">
      <summary className="cursor-pointer font-semibold marker:text-brand">{summary}</summary>
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
