'use client'

import { useEffect } from 'react'

/** Opens the <details> that the URL's #fragment names, on load and on later hash changes: the documents page's boxes
 *  start closed, and links such as /belgeler#politikalar must land on an open box. */
export function OpenDetailsFromHash() {
  useEffect(() => {
    const open = () => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
      if (el instanceof HTMLDetailsElement) el.open = true
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  return null
}
