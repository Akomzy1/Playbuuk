'use client'
// components/pwa/sw-register.tsx
// Registers the service worker on first mount — runs client-side only.
// Rendered once in the root layout. Renders nothing to the DOM.

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        // Silently check for updates in the background every 60 minutes.
        setInterval(() => reg.update(), 60 * 60 * 1000)

        // Fallback for browsers without Background Sync API:
        // when the device comes back online, tell the SW to replay
        // any queued offline journal entries immediately.
        window.addEventListener('online', () => {
          reg.active?.postMessage({ type: 'REPLAY_JOURNAL_QUEUE' })
        })

        // Listen for JOURNAL_SYNCED messages from the SW and dispatch
        // a custom DOM event so the journal page can refresh its list.
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'JOURNAL_SYNCED') {
            window.dispatchEvent(
              new CustomEvent('journal:synced', { detail: { count: event.data.count } })
            )
          }
        })
      })
      .catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[sw] Registration failed:', err)
        }
      })
  }, [])

  return null
}
