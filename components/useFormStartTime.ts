'use client'

import { startTransition, useEffect, useRef, useState, type SubmitEvent } from 'react'

/**
 * Time-trap start stamp read by `lib/form-guard.ts`'s `botCheck`. Set on the
 * form's first focus rather than in a `useEffect` (the Next 16 lint rule
 * `react-hooks/set-state-in-effect` forbids setState there), and reset after
 * a successful submit so a later resubmission needs its own 3s wait.
 */
export function useFormStartTime(succeeded: boolean) {
  const [ts, setTs] = useState('')
  const started = useRef(false)

  function onFocusCapture() {
    if (succeeded) started.current = false
    if (!started.current) {
      started.current = true
      setTs(String(Date.now()))
    }
  }

  return { ts, onFocusCapture }
}

/**
 * Submit and result handling shared by the `useActionState` forms (ContactForm, NewsletterForm, UnsubscribeForm).
 * - React resets a `<form action>` after every result, errors included; dispatching from onSubmit keeps what was
 *   typed. The forms keep `action` on the <form> for submissions before hydration or without JS.
 * - Returns early while pending, so a second Enter or click cannot submit twice.
 * - On success the form unmounts with its focused button, so focus moves to the status line (`statusRef`, tabIndex -1).
 */
export function useFormSubmit(action: (data: FormData) => void, pending: boolean, succeeded: boolean) {
  const statusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (succeeded) statusRef.current?.focus()
  }, [succeeded])

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    startTransition(() => action(new FormData(event.currentTarget)))
  }

  return { onSubmit, statusRef }
}
