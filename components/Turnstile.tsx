'use client'

// components/Turnstile.tsx: Cloudflare's widget, drawn once the script is there. The widget adds its
// `cf-turnstile-response` field to the form it sits in; a token answers once, so every form calls resetTurnstile()
// right after a submit (the FormData snapshot already holds the token). Without JS the <noscript> line shows the
// address instead: a form cannot prove anything without running something (2026-11-04).
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

type Cloudflare = { render: (el: HTMLElement, options: Record<string, unknown>) => string; reset: (id?: string) => void }

declare global {
  interface Window {
    turnstile?: Cloudflare
  }
}

/** A fresh token for the next submit: the one just sent is spent. */
export function resetTurnstile(): void {
  window.turnstile?.reset()
}

export function Turnstile({ action, fallback }: { action: string; fallback: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const widget = useRef<string | null>(null)
  // A Preview without the key draws nothing; its forms answer 'captcha', as the mail ones answer 'send_failed'
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

  useEffect(() => {
    if (!ready || !sitekey || !box.current || widget.current || !window.turnstile) return
    widget.current = window.turnstile.render(box.current, { sitekey, action, theme: 'auto' })
  }, [ready, sitekey, action])

  return (
    <>
      {sitekey ? (
        <>
          <Script src={SRC} strategy="afterInteractive" onLoad={() => setReady(true)} onReady={() => setReady(true)} />
          <div ref={box} />
        </>
      ) : null}
      <noscript>{fallback}</noscript>
    </>
  )
}
