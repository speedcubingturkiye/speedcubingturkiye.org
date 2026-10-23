// components/Done.tsx: a finished form's result (2026-10-22), in a panel where the form was, with what comes next under
// it. The message is the status line a form focuses when it is done (useFormSubmit's statusRef), so a screen reader
// reads it at once.
import type { ReactNode, RefObject } from 'react'
import { Link } from '@/i18n/navigation'

export function Done({ statusRef, message, children }: { statusRef?: RefObject<HTMLParagraphElement | null>; message: string; children?: ReactNode }) {
  return (
    <div className="grid max-w-xl gap-5 border border-line bg-bg-2 p-6">
      {/* Focused by the form, never tabbed to: the panel frames it, so no focus ring */}
      <p ref={statusRef} tabIndex={-1} role="status" className="text-lg font-semibold text-ok focus-visible:outline-none">
        {message}
      </p>
      {children}
    </div>
  )
}

/** After a membership starts or is confirmed: Hesabım and the competition calendar */
export function MemberNextSteps({ account, calendar }: { account: string; calendar: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/hesabim" className="btn btn-outline">
        {account}
      </Link>
      <Link href="/yarismalar" className="btn btn-outline">
        {calendar}
      </Link>
    </div>
  )
}
