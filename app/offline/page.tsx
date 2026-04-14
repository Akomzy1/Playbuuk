// app/offline/page.tsx
// Shown by the service worker when a navigation request fails offline
// and no cached version of the page exists.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'You\'re Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg)' }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        📡
      </div>

      {/* Heading */}
      <h1
        className="text-2xl font-bold text-text mb-2"
        style={{ letterSpacing: '-0.03em' }}
      >
        You&apos;re offline
      </h1>

      {/* Psychology-framed copy */}
      <p className="text-sm text-muted max-w-xs leading-relaxed mb-8">
        No connection right now. Any playbooks you&apos;ve already opened are available below.
        Journal entries you write offline will sync automatically when you reconnect.
      </p>

      {/* Reload CTA */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-xl text-sm font-bold"
        style={{
          background: 'var(--accent)',
          color: 'var(--bg)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>

      {/* Disclaimer */}
      <p className="text-2xs text-muted mt-12" style={{ opacity: 0.4 }}>
        Not financial advice. Trading carries substantial risk.
      </p>
    </div>
  )
}
