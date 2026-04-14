'use client'
// components/ui/disclaimer-banner.tsx
//
// Persistent slim risk disclaimer pinned to the bottom of all platform pages.
// Dismissible per session (sessionStorage) — reappears on every new visit.
// Mounted once inside AppShell so it appears on every platform route.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldAlert, X } from 'lucide-react'

const SESSION_KEY = 'pb-disclaimer-dismissed'

export function DisclaimerBanner() {
  // Start hidden to avoid a flash — we check sessionStorage after mount
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    // Fixed to bottom of viewport. z-40 sits above page content but below
    // modals (z-50) and the mobile nav (z-50). padding-bottom accounts for
    // iOS safe-area notch and the banner itself.
    <div
      role="region"
      aria-label="Risk disclaimer"
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background:    'rgba(5,8,16,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop:     '1px solid rgba(26,40,69,0.9)',
        boxShadow:     '0 -8px 32px rgba(0,0,0,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-7xl mx-auto">

        {/* Icon */}
        <ShieldAlert
          size={14}
          aria-hidden="true"
          className="flex-shrink-0"
          style={{ color: 'var(--gold)' }}
        />

        {/* Copy */}
        <p className="flex-1 text-2xs font-mono leading-relaxed min-w-0"
          style={{ color: '#6b7fa3' }}
        >
          <span className="font-semibold" style={{ color: '#8a9bc0' }}>
            Playbuuk is a strategy discipline tool, not financial advice.
          </span>
          {' '}Trading financial instruments carries a substantial risk of loss
          and may not be suitable for all investors. Past performance is not
          indicative of future results.{' '}
          <Link
            href="/disclaimer"
            className="underline underline-offset-2 transition-colors hover:text-text"
            style={{ color: '#8a9bc0' }}
          >
            Full risk disclosure
          </Link>
          {' '}·{' '}
          <Link
            href="/terms"
            className="underline underline-offset-2 transition-colors hover:text-text"
            style={{ color: '#8a9bc0' }}
          >
            Terms
          </Link>
        </p>

        {/* Dismiss */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss disclaimer"
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: '#3d5078' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6b7fa3')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3d5078')}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
