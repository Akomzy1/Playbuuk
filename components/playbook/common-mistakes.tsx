'use client'

// components/playbook/common-mistakes.tsx
// Mentor's common trading psychology traps — the specific failure modes
// observed in traders attempting this strategy.
//
// Tier gating is handled by the parent — wrap this in <TierGate> in the page.
// This component always renders its full content; blur/overlay is TierGate's job.
//
// Psychology framing:
//   Knowing the trap is half the battle. These aren't general tips — they're
//   the precise patterns this mentor has seen break discipline in this strategy.

import { AlertTriangle } from 'lucide-react'

// ─── CommonMistakes ───────────────────────────────────────────────────────────

interface CommonMistakesProps {
  mistakes: string[]
}

export function CommonMistakes({ mistakes }: CommonMistakesProps) {
  if (mistakes.length === 0) return null

  return (
    <section aria-labelledby="common-mistakes-heading">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,77,106,0.18)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 py-3.5"
          style={{
            background: 'rgba(255,77,106,0.06)',
            borderBottom: '1px solid rgba(255,77,106,0.18)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,77,106,0.1)',
              border: '1px solid rgba(255,77,106,0.25)',
            }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--danger)' }} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2
              id="common-mistakes-heading"
              className="text-sm font-bold text-text"
              style={{ letterSpacing: '-0.01em' }}
            >
              Common Mistakes
            </h2>
            <p className="text-xs text-dim">Psychology traps — know these patterns.</p>
          </div>
          <span
            className="flex-shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,77,106,0.1)',
              color: 'var(--danger)',
            }}
            aria-hidden="true"
          >
            {mistakes.length}
          </span>
        </div>

        {/* Mistakes list */}
        <div className="flex flex-col" style={{ background: 'var(--card)' }}>
          {mistakes.map((mistake, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-150"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,77,106,0.025)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                style={{
                  background: 'rgba(255,77,106,0.1)',
                  color: 'var(--danger)',
                  minWidth: '1.25rem',
                }}
                aria-hidden="true"
              >
                ✕
              </span>
              <p className="text-sm text-text leading-relaxed">{mistake}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
