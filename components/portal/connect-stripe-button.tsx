'use client'

// components/portal/connect-stripe-button.tsx
// Stripe Connect onboarding button for the mentor portal settings page.
//
// States:
//   Not connected → CTA button, redirects to Stripe Express onboarding
//   Connected, not verified → amber "pending" state, re-entry link to finish onboarding
//   Connected + verified → green "Connected ✓" badge, link to Stripe Express dashboard
//
// Usage:
//   <ConnectStripeButton
//     stripeConnectId={mentor.stripe_connect_id}
//     isVerified={mentor.verified}
//   />

import { useState } from 'react'
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectStripeButtonProps {
  /** null if mentor has not started Connect onboarding */
  stripeConnectId: string | null
  /** true once charges_enabled + payouts_enabled from account.updated webhook */
  isVerified: boolean
  /** Optional: escrow amount waiting to be released — shown as motivation */
  escrowAmount?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchOnboardingUrl(): Promise<string> {
  const res = await fetch('/api/stripe/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = (await res.json()) as { url?: string; error?: string }

  if (!res.ok || !data.url) {
    throw new Error(data.error ?? 'Failed to create Connect link')
  }

  return data.url
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── ConnectStripeButton ──────────────────────────────────────────────────────

export function ConnectStripeButton({
  stripeConnectId,
  isVerified,
  escrowAmount,
}: ConnectStripeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasEscrow = typeof escrowAmount === 'number' && escrowAmount > 0

  async function handleConnect() {
    setError('')
    setLoading(true)
    try {
      const url = await fetchOnboardingUrl()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── State: verified + connected ────────────────────────────────────────────
  if (stripeConnectId && isVerified) {
    return (
      <div
        className="flex flex-col gap-3 p-4 rounded-2xl"
        style={{
          background: 'rgba(0,229,176,0.06)',
          border: '1px solid rgba(0,229,176,0.2)',
        }}
      >
        {/* Status badge */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(0,229,176,0.12)',
              border: '1px solid rgba(0,229,176,0.25)',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--accent)', letterSpacing: '-0.01em' }}
            >
              Stripe Connected ✓
            </p>
            <p className="text-xs text-dim">Payouts active — monthly on the 5th</p>
          </div>
        </div>

        {/* Dashboard link */}
        <a
          href="https://connect.stripe.com/express_login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: 'transparent',
            border: '1px solid rgba(0,229,176,0.3)',
            color: 'var(--accent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,176,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <ExternalLink size={11} aria-hidden="true" />
          Open Stripe Dashboard
        </a>
      </div>
    )
  }

  // ── State: connected but not yet verified ──────────────────────────────────
  if (stripeConnectId && !isVerified) {
    return (
      <div
        className="flex flex-col gap-3 p-4 rounded-2xl"
        style={{
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        {/* Status */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.25)',
            }}
          >
            <Clock size={15} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          </div>
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--gold)', letterSpacing: '-0.01em' }}
            >
              Stripe Onboarding Incomplete
            </p>
            <p className="text-xs text-dim">Finish setup to unlock payouts</p>
          </div>
        </div>

        {/* Escrow hook */}
        {hasEscrow && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.18)',
            }}
          >
            <Zap size={12} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            <p className="text-xs" style={{ color: 'var(--gold)' }}>
              <span className="font-semibold">{formatCurrency(escrowAmount!)}</span>{' '}
              in escrow — released once your account is verified.
            </p>
          </div>
        )}

        {/* Re-entry link */}
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            color: 'var(--gold)',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = 'rgba(251,191,36,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(251,191,36,0.12)'
          }}
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink size={11} aria-hidden="true" />
          )}
          {loading ? 'Redirecting…' : 'Continue Stripe Setup'}
        </button>

        {error && (
          <div className="flex items-center gap-1.5" role="alert">
            <AlertCircle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} aria-hidden="true" />
            <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
          </div>
        )}
      </div>
    )
  }

  // ── State: not connected ───────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{
            background: 'rgba(0,229,176,0.07)',
            border: '1px solid rgba(0,229,176,0.18)',
          }}
          aria-hidden="true"
        >
          💳
        </div>
        <div>
          <h3
            className="text-sm font-bold text-text"
            style={{ letterSpacing: '-0.01em' }}
          >
            Connect Stripe to receive payouts
          </h3>
          <p className="text-xs text-dim mt-0.5 leading-relaxed">
            Playbuuk pays mentors monthly based on Pro follower usage.
            Connect your Stripe account to unlock transfers.
          </p>
        </div>
      </div>

      {/* Revenue model reminder */}
      <div
        className="grid grid-cols-2 gap-2 text-xs"
        aria-label="Revenue model summary"
      >
        {[
          { label: 'Pro follower usage', share: '40%', color: 'var(--accent)' },
          { label: 'Mentor Direct sub', share: '50%', color: 'var(--gold)' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-0.5 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="text-sm font-bold font-mono"
              style={{ color: item.color }}
            >
              {item.share}
            </span>
            <span className="text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Escrow hook if applicable */}
      {hasEscrow && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: 'rgba(0,229,176,0.06)',
            border: '1px solid rgba(0,229,176,0.18)',
          }}
        >
          <Zap size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
          <p className="text-xs text-dim">
            <span className="font-semibold text-text">{formatCurrency(escrowAmount!)}</span>{' '}
            already accrued in escrow — connect Stripe to release it.
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'var(--accent)',
          color: 'var(--bg)',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.boxShadow = '0 0 24px rgba(0,229,176,0.35)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Redirecting to Stripe…
          </>
        ) : (
          <>
            <ExternalLink size={14} aria-hidden="true" />
            Connect Stripe
          </>
        )}
      </button>

      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          role="alert"
          style={{
            background: 'rgba(255,77,106,0.07)',
            border: '1px solid rgba(255,77,106,0.2)',
          }}
        >
          <AlertCircle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} aria-hidden="true" />
          <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      <p className="text-xs text-muted text-center font-mono">
        Powered by Stripe Express · Cancel anytime
      </p>
    </div>
  )
}
