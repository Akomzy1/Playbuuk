'use client'

// components/ui/upgrade-prompt.tsx
// Reusable gate wall shown when a free user tries to access a Pro feature.
// Psychology-framed — explains WHAT they're missing and WHY it matters,
// not just "you need to upgrade".
//
// Usage:
//   <UpgradePrompt feature="live_checklist" />
//   <UpgradePrompt feature="setup_grading" compact />
//   <UpgradePrompt feature="trade_execution" headline="Ready to execute?" />

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Lock, Sparkles, X } from 'lucide-react'
import {
  type GatedFeature,
  FEATURE_LABELS,
  FEATURE_PSYCHOLOGY,
} from '@/lib/auth/tierGate'

// ─── Feature visual config ────────────────────────────────────────────────────

const FEATURE_VISUALS: Record<
  GatedFeature,
  { emoji: string; accentColor: string; bgColor: string; borderColor: string }
> = {
  live_checklist: {
    emoji: '✓',
    accentColor: 'var(--accent)',
    bgColor: 'rgba(0,229,176,0.06)',
    borderColor: 'rgba(0,229,176,0.2)',
  },
  setup_grading: {
    emoji: 'A+',
    accentColor: 'var(--gold)',
    bgColor: 'rgba(251,191,36,0.06)',
    borderColor: 'rgba(251,191,36,0.2)',
  },
  trade_execution: {
    emoji: '⚡',
    accentColor: 'var(--accent)',
    bgColor: 'rgba(0,229,176,0.06)',
    borderColor: 'rgba(0,229,176,0.2)',
  },
  live_scanner: {
    emoji: '⬡',
    accentColor: 'var(--cyan)',
    bgColor: 'rgba(34,211,238,0.06)',
    borderColor: 'rgba(34,211,238,0.2)',
  },
  setup_alerts: {
    emoji: '🔔',
    accentColor: 'var(--accent)',
    bgColor: 'rgba(0,229,176,0.06)',
    borderColor: 'rgba(0,229,176,0.2)',
  },
  journal_auto_tag: {
    emoji: '📓',
    accentColor: 'var(--info)',
    bgColor: 'rgba(77,142,255,0.06)',
    borderColor: 'rgba(77,142,255,0.2)',
  },
  psychology_insights: {
    emoji: '🧠',
    accentColor: 'var(--purple)',
    bgColor: 'rgba(167,139,250,0.06)',
    borderColor: 'rgba(167,139,250,0.2)',
  },
  exclusive_mentor_content: {
    emoji: '✦',
    accentColor: 'var(--gold)',
    bgColor: 'rgba(251,191,36,0.06)',
    borderColor: 'rgba(251,191,36,0.2)',
  },
}

// ─── Checkout helper ──────────────────────────────────────────────────────────

async function startProCheckout(): Promise<{ url: string } | { error: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'pro' }),
  })
  return res.json() as Promise<{ url: string } | { error: string }>
}

// ─── UpgradePrompt ────────────────────────────────────────────────────────────

interface UpgradePromptProps {
  /** The gated feature — determines copy and accent colour */
  feature: GatedFeature
  /** Optional headline override — defaults to "Unlock [feature label]" */
  headline?: string
  /** Compact mode — smaller card, less copy. Good for inline gates. */
  compact?: boolean
  /** If true, the component renders as an inline block rather than full-width */
  inline?: boolean
}

export function UpgradePrompt({
  feature,
  headline,
  compact = false,
  inline = false,
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const visual = FEATURE_VISUALS[feature]
  const label = FEATURE_LABELS[feature]
  const psychology = FEATURE_PSYCHOLOGY[feature]

  async function handleUpgrade() {
    setError('')
    setLoading(true)
    try {
      const result = await startProCheckout()
      if ('error' in result) {
        setError(result.error)
        return
      }
      window.location.href = result.url
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Compact inline variant ────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${inline ? 'inline-flex' : 'w-full'}`}
        style={{
          background: visual.bgColor,
          border: `1px solid ${visual.borderColor}`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `${visual.accentColor}18`,
            border: `1px solid ${visual.borderColor}`,
          }}
        >
          <Lock size={13} style={{ color: visual.accentColor }} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-text">{label}</span>
          <span className="text-xs text-dim ml-1.5">requires Pro</span>
        </div>

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.boxShadow = '0 0 16px rgba(0,229,176,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          ) : (
            <>
              <Sparkles size={11} aria-hidden="true" />
              Upgrade
            </>
          )}
        </button>
      </div>
    )
  }

  // ── Full card variant ─────────────────────────────────────────────────────
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 flex flex-col items-center text-center w-full"
      style={{
        background: `linear-gradient(160deg, ${visual.bgColor} 0%, rgba(11,17,33,0.97) 60%)`,
        border: `1px solid ${visual.borderColor}`,
        boxShadow: `0 0 40px ${visual.accentColor}10, 0 8px 48px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20"
        style={{ background: visual.accentColor }}
      />

      {/* Feature icon */}
      <div
        className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: `${visual.accentColor}15`,
          border: `1px solid ${visual.borderColor}`,
          boxShadow: `0 0 24px ${visual.accentColor}18`,
        }}
      >
        {/* Lock overlay */}
        <div
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--bg)',
            border: `1px solid ${visual.borderColor}`,
          }}
        >
          <Lock size={10} style={{ color: visual.accentColor }} aria-hidden="true" />
        </div>

        <span
          className="font-mono font-bold text-xl leading-none"
          style={{ color: visual.accentColor }}
          aria-hidden="true"
        >
          {visual.emoji}
        </span>
      </div>

      {/* Headline */}
      <h3
        className="relative z-10 text-xl font-bold text-text mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        {headline ?? `Unlock ${label}`}
      </h3>

      {/* Psychology copy */}
      <p className="relative z-10 text-sm text-dim leading-relaxed mb-2 max-w-sm">
        {psychology}
      </p>

      <p className="relative z-10 text-xs text-muted mb-6">
        Available on{' '}
        <span
          className="font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Playbuuk Pro
        </span>{' '}
        — $19.99/month
      </p>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl mb-4 w-full max-w-sm animate-fade-in"
          role="alert"
          style={{
            background: 'rgba(255,77,106,0.08)',
            border: '1px solid rgba(255,77,106,0.25)',
          }}
        >
          <X size={13} className="flex-shrink-0 text-danger" aria-hidden="true" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {/* CTA row */}
      <div className="relative z-10 flex items-center gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="flex-1 btn-primary py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
          style={{ boxShadow: `0 0 20px ${visual.accentColor}25` }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.boxShadow = `0 0 32px ${visual.accentColor}40`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 0 20px ${visual.accentColor}25`
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Redirecting…
            </>
          ) : (
            <>
              <Sparkles size={14} aria-hidden="true" />
              Upgrade to Pro
              <ArrowRight
                size={14}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>

        <Link
          href="/pricing"
          className="flex-shrink-0 py-3 px-4 rounded-xl text-sm text-dim hover:text-text transition-colors"
        >
          See all plans
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="relative z-10 font-mono text-2xs text-muted mt-4">
        Cancel anytime · Not financial advice
      </p>
    </div>
  )
}
