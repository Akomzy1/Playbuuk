// components/ui/trade-disclaimer.tsx
//
// Inline risk disclaimer for trade-related UI surfaces:
//   - Trade execution confirmation dialogs
//   - Trade panel (playbook viewer)
//   - Alert notification bodies
//
// Usage:
//   import { TradeDisclaimer } from '@/components/ui/trade-disclaimer'
//
//   <TradeDisclaimer />                      // default — one-line
//   <TradeDisclaimer variant="expanded" />   // two lines with link
//   <TradeDisclaimer variant="execution" />  // pre-execution confirmation copy

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

type Variant = 'default' | 'expanded' | 'execution'

interface TradeDisclaimerProps {
  variant?: Variant
  className?: string
}

export function TradeDisclaimer({ variant = 'default', className }: TradeDisclaimerProps) {
  if (variant === 'execution') {
    // Used inside trade execution confirmation modal
    return (
      <div
        className={`rounded-xl px-4 py-3 ${className ?? ''}`}
        style={{
          background: 'rgba(255,77,106,0.04)',
          border:     '1px solid rgba(255,77,106,0.15)',
        }}
        role="note"
        aria-label="Risk reminder"
      >
        <div className="flex items-start gap-2.5">
          <ShieldAlert
            size={13}
            className="flex-shrink-0 mt-0.5"
            style={{ color: 'var(--gold)' }}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold" style={{ color: '#c0a0a8' }}>
              You are about to execute a live trade.
            </p>
            <p className="text-2xs leading-relaxed" style={{ color: '#6b7fa3' }}>
              Playbuuk provides discipline tooling, not financial advice. Trading carries
              substantial risk of loss. This execution will be logged with the current setup grade
              and your configured parameters. Ensure SL/TP values are correct before confirming.{' '}
              <Link
                href="/disclaimer"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-dim transition-colors"
              >
                Risk disclosure
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'expanded') {
    return (
      <p className={`text-2xs font-mono leading-relaxed ${className ?? ''}`} style={{ color: '#3d5078' }}>
        <span className="font-semibold" style={{ color: '#5a6e8a' }}>Not financial advice.</span>{' '}
        Trading carries substantial risk of loss. Playbuuk is a discipline tool — setup grades are
        analytical assessments, not trade recommendations.{' '}
        <Link
          href="/disclaimer"
          className="underline underline-offset-2 hover:text-muted transition-colors"
        >
          Full risk disclosure
        </Link>
        .
      </p>
    )
  }

  // default — single line
  return (
    <p className={`text-2xs font-mono ${className ?? ''}`} style={{ color: '#3d5078' }}>
      Not financial advice · Trading carries substantial risk ·{' '}
      <Link
        href="/disclaimer"
        className="underline underline-offset-2 hover:text-muted transition-colors"
      >
        Disclosure
      </Link>
    </p>
  )
}
