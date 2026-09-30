'use client'

import { useActionState, useEffect, useRef, useState, useTransition, type SubmitEvent } from 'react'

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
 * Submit and result handling shared by the Server Action forms (ContactForm, NewsletterForm, UnsubscribeForm).
 * - `formAction` goes on the <form> for submissions before hydration or without JS: React then renders the result
 *   on the server (`useActionState`). With JS, onSubmit calls the action itself, so what was typed stays in the
 *   form (React resets a `<form action>` after every result, errors included).
 * - A call the action never answers (the Vercel firewall's rate limit answers 429, the network fails) resolves to
 *   `failed` instead of throwing into Next's "This page couldn't load" screen.
 * - Returns early while pending, so a second Enter or click cannot submit twice.
 * - On success the form unmounts with its focused button, so focus moves to the status line (`statusRef`, tabIndex -1).
 */
export function useFormSubmit<S>(
  serverAction: (prev: Awaited<S>, data: FormData) => Promise<S>,
  initial: Awaited<S>,
  failed: Awaited<S>,
  isDone: (state: Awaited<S>) => boolean,
) {
  const [formState, formAction] = useActionState(serverAction, initial)
  const [state, setState] = useState(formState)
  const [pending, startSubmit] = useTransition()
  const statusRef = useRef<HTMLParagraphElement>(null)
  const done = isDone(state)

  useEffect(() => {
    if (done) statusRef.current?.focus()
  }, [done])

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    startSubmit(async () => {
      let next: Awaited<S>
      try {
        next = await serverAction(state, data)
      } catch {
        next = failed
      }
      startSubmit(() => setState(next))
    })
  }

  return { state, formAction, pending, done, onSubmit, statusRef }
}
