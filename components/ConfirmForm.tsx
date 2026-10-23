'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  /** the server action that confirms (app/actions/confirm.ts) */
  action: (formData: FormData) => Promise<void>
  /** hidden fields: the link's token(s) and the page's locale */
  fields: Record<string, string>
  label: string
  pendingLabel: string
}

/** A confirm page's one button (2026-10-22): the mailed link opens the page, the press confirms. While the sheet answers
 *  (up to a few seconds) the button says so and takes no second press. Without JS the form still posts. */
export function ConfirmForm({ action, fields, label, pendingLabel }: Props) {
  return (
    <form action={action} className="mt-6">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ConfirmButton label={label} pendingLabel={pendingLabel} />
    </form>
  )
}

function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-brand disabled:opacity-70">
      {pending ? pendingLabel : label}
    </button>
  )
}
