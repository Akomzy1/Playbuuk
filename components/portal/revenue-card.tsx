'use client'

// components/portal/revenue-card.tsx
// Revenue display for the mentor portal dashboard.
//
// Shows:
//   · Estimated earnings this month (from current period usage points)
//   · Total earned all time (sum of paid payouts)
//   · Accrued escrow balance (for unverified / pre-payout mentors)
//   · Stripe connect CTA (if not connected)
//   · Payout history table: last 6 payouts, status badges
//
// For unverified mentors: shows escrow balance with "Claim by connecting"
// CTA instead of payout history.

import { motion }     from 'framer-motion'
import { format }     from 'date-fns'
import {
  DollarSign, Clock, CheckCircle2, AlertCircle,
  Loader2, XCircle, ChevronRight, Lock,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutRecord {
  id:           string
  periodLabel:  string   // "Jan 2025"
  totalAmount:  number
  proAmount:    number
  directAmount: number
  status:       'accrued' | 'pending' | 'processing' | 'paid' | 'failed'
  paidAt:       string | null  // ISO string
}

export interface RevenueCardProps {
  estimatedThisMonth:  number
  totalEarned:         number
  escrowBalance:       number
  isVerified:          boolean
  hasStripeConnect:    boolean
  currency?:           string
  payouts:             PayoutRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  return amount.toLocaleString('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const STATUS_CONFIG: Record<
  PayoutRecord['status'],
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  accrued:    { label: 'Accrued',    color: 'var(--muted)',   bg: 'var(--surface)',              border: 'var(--border)',              icon: Clock         },
  pending:    { label: 'Pending',    color: 'var(--warning)', bg: 'rgba(251,146,60,0.06)',        border: 'rgba(251,146,60,0.2)',        icon: Clock         },
  processing: { label: 'Processing', color: 'var(--info)',    bg: 'rgba(77,142,255,0.08)',         border: 'rgba(77,142,255,0.2)',        icon: Loader2       },
  paid:       { label: 'Paid',       color: 'var(--accent)',  bg: 'rgba(0,229,176,0.07)',          border: 'rgba(0,229,176,0.2)',         icon: CheckCircle2  },
  failed:     { label: 'Failed',     color: 'var(--danger)',  bg: 'rgba(255,77,106,0.06)',         border: 'rgba(255,77,106,0.15)',       icon: XCircle       },
}

// ─── RevenueCard ──────────────────────────────────────────────────────────────

export function RevenueCard({
  estimatedThisMonth, totalEarned, escrowBalance,
  isVerified, hasStripeConnect, currency = 'USD', payouts,
}: RevenueCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      aria-label="Revenue overview"
      className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: 'var(--card)',
        border:     '1px solid var(--border)',
        borderTop:  '2px solid rgba(0,229,176,0.22)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-bold text-text"
            style={{ letterSpacing: '-0.01em' }}
          >
            Revenue
          </h3>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)' }}
            aria-hidden="true"
          >
            <DollarSign size={14} style={{ color: 'var(--accent)' }} />
          </div>
        </div>
      </div>

      {/* ── Main figures ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border)' }}>

        {/* Estimated this month */}
        <div>
          <p
            className="text-2xs font-mono"
            style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
          >
            EST. THIS MONTH
          </p>
          <p
            className="text-3xl font-bold font-mono tabular-nums mt-1"
            style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}
            aria-label={`Estimated earnings this month: ${formatCurrency(estimatedThisMonth)}`}
          >
            {formatCurrency(estimatedThisMonth, currency)}
          </p>
          <p className="text-2xs font-mono text-muted mt-0.5">
            Based on usage points this period
          </p>
        </div>

        {/* Total earned + escrow row */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-2xs font-mono text-muted" style={{ letterSpacing: '0.04em' }}>
              TOTAL EARNED
            </p>
            <p
              className="text-base font-bold font-mono tabular-nums mt-0.5"
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              {formatCurrency(totalEarned, currency)}
            </p>
          </div>

          {escrowBalance > 0 && (
            <div
              className="rounded-xl p-3"
              style={{
                background: isVerified ? 'var(--surface)' : 'rgba(251,191,36,0.04)',
                border:     isVerified ? '1px solid var(--border)' : '1px solid rgba(251,191,36,0.15)',
              }}
            >
              <p
                className="text-2xs font-mono"
                style={{
                  color:          isVerified ? 'var(--muted)' : 'var(--gold)',
                  letterSpacing:  '0.04em',
                }}
              >
                ACCRUED
              </p>
              <p
                className="text-base font-bold font-mono tabular-nums mt-0.5"
                style={{ color: isVerified ? 'var(--text)' : 'var(--gold)', letterSpacing: '-0.02em' }}
              >
                {formatCurrency(escrowBalance, currency)}
              </p>
            </div>
          )}
        </div>

        {/* Stripe connect CTA for unverified mentors */}
        {!isVerified && escrowBalance > 0 && (
          <div
            className="rounded-xl p-3 flex items-start gap-2.5"
            style={{
              background: 'rgba(251,191,36,0.04)',
              border:     '1px solid rgba(251,191,36,0.15)',
            }}
          >
            <Lock size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                {formatCurrency(escrowBalance, currency)} waiting for you
              </p>
              <p className="text-2xs text-dim mt-0.5 leading-relaxed">
                Verify your playbook and connect Stripe to release your accrued earnings.
              </p>
            </div>
          </div>
        )}

        {/* Stripe CTA */}
        {isVerified && !hasStripeConnect && (
          <Link
            href="/portal/settings"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
            style={{
              background: 'rgba(0,229,176,0.06)',
              border:     '1px solid rgba(0,229,176,0.2)',
              color:      'var(--accent)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,229,176,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,229,176,0.06)'
            }}
          >
            <span className="text-xs font-semibold">Connect Stripe to receive payouts</span>
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* ── Payout history ────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 py-4">
        <p
          className="text-2xs font-mono mb-3"
          style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
        >
          PAYOUT HISTORY
        </p>

        {payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle size={20} style={{ color: 'var(--muted)' }} aria-hidden="true" className="mb-2" />
            <p className="text-xs text-muted">
              {isVerified
                ? 'No payouts yet — your first payout calculates at end of month.'
                : 'Earnings are accruing. Verify to unlock payouts.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="list">
            {payouts.map(payout => {
              const cfg = STATUS_CONFIG[payout.status]
              const StatusIcon = cfg.icon
              return (
                <div
                  key={payout.id}
                  role="listitem"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono font-semibold text-text">
                      {payout.periodLabel}
                    </span>
                    {payout.paidAt && (
                      <span className="text-2xs font-mono text-muted">
                        Paid {format(new Date(payout.paidAt), 'MMM d')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-sm font-bold font-mono tabular-nums"
                      style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
                    >
                      {formatCurrency(payout.totalAmount, currency)}
                    </span>
                    <span
                      className="flex items-center gap-1 text-2xs font-mono font-bold px-2 py-0.5 rounded"
                      style={{
                        background: cfg.bg,
                        border:     `1px solid ${cfg.border}`,
                        color:      cfg.color,
                      }}
                    >
                      <StatusIcon size={9} aria-hidden="true" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Revenue share note */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-2xs font-mono text-muted leading-relaxed">
          Pro pool: 40% share · Direct: 50% share · Points: opens(1) + time(1/5min) + logged(2) + executed(3)
        </p>
      </div>
    </motion.section>
  )
}
