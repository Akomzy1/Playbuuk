'use client'

// components/marketplace/pricing-tiers.tsx
// Pricing cards for Free / Pro / Mentor Direct.
// Psychology-framed copy — the value proposition is discipline, not features.
// CTAs wire directly to the checkout API route.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  X,
  Zap,
  Sparkles,
  Brain,
  ShieldCheck,
  TrendingUp,
  Bell,
  BookOpen,
  Link2,
  Loader2,
  ArrowRight,
  Lock,
  Star,
} from 'lucide-react'
import type { Tier } from '@/lib/supabase/types'

// ─── Feature rows ─────────────────────────────────────────────────────────────

interface FeatureRow {
  label: string
  icon: React.ElementType
  why: string
  free: boolean | 'partial'
  pro: boolean
  direct: boolean
}

const FEATURES: FeatureRow[] = [
  {
    label: 'Follow mentors',
    icon: Star,
    why: 'Find the strategy that fits your psychology before committing.',
    free: true,
    pro: true,
    direct: true,
  },
  {
    label: 'Playbook preview (summary + golden rules)',
    icon: BookOpen,
    why: 'Understand the strategy. The discipline engine is what makes you follow it.',
    free: 'partial',
    pro: true,
    direct: true,
  },
  {
    label: 'Live market sync',
    icon: TrendingUp,
    why: 'Real-time price data auto-evaluates your checklist. No manual chart reading.',
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Auto-detecting checklist',
    icon: ShieldCheck,
    why: "BOS either happened or it didn't. Removes the 'looks close enough' lie.",
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Setup grading (A+ to D+)',
    icon: Brain,
    why: "Instead of 'do I feel good about this?', you ask 'what's the grade?'",
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Psychology-gated execution',
    icon: Lock,
    why: "The execute button is disabled below your minimum grade. That's the discipline.",
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Live multi-mentor scanner',
    icon: Zap,
    why: "See which setups are forming across all your followed mentors' playbooks.",
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'A+ setup push alerts',
    icon: Bell,
    why: "Stop chart staring. Walk away. We'll tell you when your setup is ready.",
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Auto-tagged trade journal',
    icon: BookOpen,
    why: 'Every trade logged with grade, override status, and mentor playbook used.',
    free: 'partial',
    pro: true,
    direct: true,
  },
  {
    label: 'Psychology pattern insights',
    icon: Brain,
    why: '"You override 4x more during NY session on Fridays. Your NY win rate: 18%."',
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'MT5/MT4 trade execution',
    icon: Link2,
    why: 'Grade confirmed → one tap → trade placed. No platform switching, no hesitation.',
    free: false,
    pro: true,
    direct: true,
  },
  {
    label: 'Exclusive mentor content',
    icon: Sparkles,
    why: 'Live sessions, premium annotations, and direct feedback from the mentor.',
    free: false,
    pro: false,
    direct: true,
  },
]

// ─── Checkout helper ──────────────────────────────────────────────────────────

async function startCheckout(
  tier: 'pro' | 'mentor_direct',
  mentorId?: string,
): Promise<{ url: string } | { error: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier, mentorId }),
  })
  return res.json() as Promise<{ url: string } | { error: string }>
}

// ─── FeatureItem ──────────────────────────────────────────────────────────────

function FeatureItem({
  row,
  value,
  highlight,
}: {
  row: FeatureRow
  value: boolean | 'partial'
  highlight: boolean
}) {
  return (
    <li className="flex items-start gap-3 py-1.5 group">
      <div className="flex-shrink-0 mt-0.5">
        {value === true ? (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              background: highlight ? 'rgba(0,229,176,0.18)' : 'rgba(107,127,163,0.12)',
            }}
          >
            <Check
              size={10}
              strokeWidth={3}
              style={{ color: highlight ? 'var(--accent)' : 'var(--dim)' }}
              aria-hidden="true"
            />
          </div>
        ) : value === 'partial' ? (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.12)' }}
          >
            <span
              className="font-mono font-bold leading-none"
              style={{ fontSize: 9, color: 'var(--gold)' }}
            >
              ~
            </span>
          </div>
        ) : (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(107,127,163,0.08)' }}
          >
            <X size={9} strokeWidth={2.5} style={{ color: 'var(--muted)' }} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span
          className="text-sm leading-snug block"
          style={{ color: value ? 'var(--text)' : 'var(--muted)' }}
        >
          {row.label}
        </span>
        {value && (
          <p
            className="text-xs mt-0.5 leading-relaxed max-h-0 overflow-hidden group-hover:max-h-16 transition-all duration-300"
            style={{ color: 'var(--dim)' }}
          >
            {row.why}
          </p>
        )}
      </div>
    </li>
  )
}

// ─── PricingTiers ─────────────────────────────────────────────────────────────

interface PricingTiersProps {
  currentTier?: Tier
  mentorId?: string
  mentorName?: string
}

export function PricingTiers({ currentTier, mentorId, mentorName }: PricingTiersProps) {
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<'pro' | 'mentor_direct' | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  async function handleCheckout(tier: 'pro' | 'mentor_direct') {
    setCheckoutError('')
    setLoadingTier(tier)
    try {
      const result = await startCheckout(
        tier,
        tier === 'mentor_direct' ? mentorId : undefined,
      )
      if ('error' in result) {
        if (result.error.includes('already have')) {
          router.push('/accounts')
        } else {
          setCheckoutError(result.error)
        }
        return
      }
      window.location.href = result.url
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const isPro = currentTier === 'pro'
  const busy = loadingTier !== null

  return (
    <section aria-label="Subscription pricing" className="w-full">
      {/* Header */}
      <div className="text-center mb-10 px-4">
        <h2 className="text-3xl font-bold text-text mb-3 text-balance">
          Your strategy works.{' '}
          <span className="text-gradient">Your psychology doesn&apos;t.</span>
        </h2>
        <p className="text-dim text-base max-w-xl mx-auto leading-relaxed">
          Playbuuk fixes the gap between knowing your rules and actually following them.
          The discipline engine is what makes the difference.
        </p>
      </div>

      {/* Error banner */}
      {checkoutError && (
        <div
          className="flex items-center gap-2.5 p-3.5 rounded-xl mb-6 max-w-lg mx-auto animate-fade-in"
          role="alert"
          style={{
            background: 'rgba(255,77,106,0.08)',
            border: '1px solid rgba(255,77,106,0.25)',
          }}
        >
          <X size={14} className="flex-shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{checkoutError}</p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start max-w-5xl mx-auto px-4">

        {/* ─ Free ─ */}
        <div
          className="rounded-3xl p-6 flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(107,127,163,0.12)',
                  border: '1px solid rgba(107,127,163,0.18)',
                }}
              >
                <Star size={15} strokeWidth={1.8} style={{ color: 'var(--dim)' }} aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-dim">Free</span>
            </div>

            <div className="flex items-end gap-1 mb-2">
              <span className="text-[2.5rem] font-bold font-mono text-text leading-none">$0</span>
              <span className="text-dim text-sm mb-1">/mo</span>
            </div>

            <p className="text-sm text-dim leading-relaxed">
              Follow mentors and explore strategies. The discipline engine unlocks with Pro.
            </p>
          </div>

          <div className="mb-5">
            {!currentTier || currentTier === 'free' ? (
              <div
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-center"
                style={{
                  background: 'rgba(107,127,163,0.08)',
                  border: '1px solid rgba(107,127,163,0.15)',
                  color: 'var(--dim)',
                }}
              >
                Current plan
              </div>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--dim)',
                }}
                onClick={() => router.push('/accounts')}
              >
                Manage subscription
              </button>
            )}
          </div>

          <ul className="flex-1 space-y-0">
            {FEATURES.map((f) => (
              <FeatureItem key={f.label} row={f} value={f.free} highlight={false} />
            ))}
          </ul>
        </div>

        {/* ─ Pro — Most Popular ─ */}
        <div
          className="rounded-3xl p-6 flex flex-col relative overflow-hidden"
          style={{
            background:
              'linear-gradient(160deg, rgba(0,229,176,0.07) 0%, rgba(11,17,33,0.97) 55%)',
            border: '1px solid rgba(0,229,176,0.32)',
            boxShadow:
              '0 0 48px rgba(0,229,176,0.07), 0 8px 48px rgba(0,0,0,0.45)',
          }}
        >
          {/* Ambient top-corner glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-25"
            style={{ background: 'var(--accent)' }}
          />

          <div className="mb-5 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(0,229,176,0.15)',
                    border: '1px solid rgba(0,229,176,0.3)',
                  }}
                >
                  <Zap size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--accent)' }}
                >
                  Pro
                </span>
              </div>

              <span
                className="text-2xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full font-mono"
                style={{
                  background: 'rgba(0,229,176,0.12)',
                  border: '1px solid rgba(0,229,176,0.25)',
                  color: 'var(--accent)',
                }}
              >
                Most popular
              </span>
            </div>

            <div className="flex items-end gap-1 mb-2">
              <span className="text-[2.5rem] font-bold font-mono text-text leading-none">
                $19.99
              </span>
              <span className="text-dim text-sm mb-1">/mo</span>
            </div>

            <p className="text-sm text-dim leading-relaxed">
              The full discipline engine — auto-detecting checklists, A+ to D+ grading,
              psychology-gated execution, and alerts — for every mentor you follow.
            </p>
          </div>

          <div className="mb-5 relative z-10">
            {isPro ? (
              <div
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(0,229,176,0.1)',
                  border: '1px solid rgba(0,229,176,0.25)',
                  color: 'var(--accent)',
                }}
              >
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                Current plan
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleCheckout('pro')}
                disabled={busy}
                className="w-full btn-primary py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 24px rgba(0,229,176,0.22)' }}
                onMouseEnter={(e) => {
                  if (!busy) e.currentTarget.style.boxShadow = '0 0 36px rgba(0,229,176,0.38)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(0,229,176,0.22)'
                }}
              >
                {loadingTier === 'pro' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Redirecting to checkout…
                  </>
                ) : (
                  <>
                    Stop trading on emotion
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            )}
          </div>

          <ul className="flex-1 space-y-0 relative z-10">
            {FEATURES.map((f) => (
              <FeatureItem key={f.label} row={f} value={f.pro} highlight />
            ))}
          </ul>
        </div>

        {/* ─ Mentor Direct ─ */}
        <div
          className="rounded-3xl p-6 flex flex-col relative overflow-hidden"
          style={{
            background:
              'linear-gradient(160deg, rgba(251,191,36,0.05) 0%, rgba(11,17,33,0.97) 55%)',
            border: '1px solid rgba(251,191,36,0.22)',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20"
            style={{ background: 'var(--gold)' }}
          />

          <div className="mb-5 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.25)',
                }}
              >
                <Sparkles size={15} strokeWidth={2} style={{ color: 'var(--gold)' }} aria-hidden="true" />
              </div>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--gold)' }}
              >
                Mentor Direct
              </span>
            </div>

            <div className="flex items-end gap-1 mb-0.5">
              <span className="text-[2.5rem] font-bold font-mono text-text leading-none">
                $9.99
              </span>
              <span className="text-dim text-sm mb-1">/mo</span>
            </div>
            <p className="text-2xs font-mono text-muted mb-2">Added on top of Pro</p>

            <p className="text-sm text-dim leading-relaxed">
              Everything in Pro, plus exclusive content and direct access to{' '}
              {mentorName ? (
                <span className="text-text font-semibold">{mentorName}</span>
              ) : (
                'one specific mentor'
              )}
              .
            </p>
          </div>

          <div className="mb-5 relative z-10">
            {mentorId ? (
              <button
                type="button"
                onClick={() => handleCheckout('mentor_direct')}
                disabled={busy || !isPro}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                style={{
                  background: isPro
                    ? 'rgba(251,191,36,0.12)'
                    : 'rgba(107,127,163,0.07)',
                  border: `1px solid ${isPro ? 'rgba(251,191,36,0.3)' : 'rgba(107,127,163,0.12)'}`,
                  color: isPro ? 'var(--gold)' : 'var(--muted)',
                  opacity: busy ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isPro && !busy) {
                    e.currentTarget.style.background = 'rgba(251,191,36,0.18)'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isPro
                    ? 'rgba(251,191,36,0.12)'
                    : 'rgba(107,127,163,0.07)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                title={!isPro ? 'Pro subscription required first' : undefined}
                aria-disabled={!isPro}
              >
                {loadingTier === 'mentor_direct' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Redirecting…
                  </>
                ) : !isPro ? (
                  <>
                    <Lock size={14} aria-hidden="true" />
                    Requires Pro first
                  </>
                ) : (
                  <>
                    <Sparkles size={14} aria-hidden="true" />
                    Get {mentorName ? `${mentorName} Direct` : 'Mentor Direct'}
                  </>
                )}
              </button>
            ) : (
              <p className="text-xs text-muted text-center py-2 leading-relaxed">
                Available from any mentor&apos;s profile page. Requires an active Pro subscription.
              </p>
            )}
          </div>

          <ul className="flex-1 space-y-0 relative z-10">
            {FEATURES.map((f) => (
              <FeatureItem key={f.label} row={f} value={f.direct} highlight={false} />
            ))}
          </ul>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center font-mono text-2xs text-muted mt-8 px-4">
        Cancel anytime · No contracts{' '}
        <span className="mx-2 opacity-30">·</span>
        Not financial advice. Trading carries substantial risk.
      </p>
    </section>
  )
}
