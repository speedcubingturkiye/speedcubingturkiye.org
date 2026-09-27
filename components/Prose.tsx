import type { ReactNode } from 'react'

// Typography for MDX bodies. Tailwind-only (no typography plugin): descendant variants on one wrapper.
// Heading sizes, widths and case come from the base styles in globals.css; only spacing is set here.
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="leading-relaxed text-fg [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_hr]:my-10 [&_hr]:border-line [&_blockquote]:border-l [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:text-fg-2 [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:text-sm">
      {children}
    </div>
  )
}
