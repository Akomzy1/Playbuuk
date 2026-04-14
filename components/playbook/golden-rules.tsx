'use client'

// components/playbook/golden-rules.tsx
// Mentor's non-negotiable golden rules — always visible, even on free tier.
// Psychology framing: rules are the discipline framework, not suggestions.
// Common mistakes have been moved to common-mistakes.tsx (Pro-only).

import { Shield } from 'lucide-react'

// ─── GoldenRules ──────────────────────────────────────────────────────────────

interface GoldenRulesProps {
  goldenRules: string[]
}

export function GoldenRules({ goldenRules }: GoldenRulesProps) {
  if (goldenRules.length === 0) return null

  return (
    <section aria-labelledby="golden-rules-heading">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(0,229,176,0.18)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 py-3.5"
          style={{
            background: 'rgba(0,229,176,0.07)',
            borderBottom: '1px solid rgba(0,229,176,0.18)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(0,229,176,0.12)',
              border: '1px solid rgba(0,229,176,0.25)',
            }}
          >
            <Shield size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2
              id="golden-rules-heading"
              className="text-sm font-bold text-text"
              style={{ letterSpacing: '-0.01em' }}
            >
              Golden Rules
            </h2>
            <p className="text-xs text-dim">Non-negotiable. Follow every rule, every trade.</p>
          </div>
          <span
            className="flex-shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0,229,176,0.1)',
              color: 'var(--accent)',
            }}
            aria-hidden="true"
          >
            {goldenRules.length}
          </span>
        </div>

        {/* Rules list */}
        <div className="flex flex-col" style={{ background: 'var(--card)' }}>
          {goldenRules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-150"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,176,0.025)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono mt-0.5"
                style={{
                  background: 'rgba(0,229,176,0.12)',
                  color: 'var(--accent)',
                  minWidth: '1.25rem',
                }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <p className="text-sm text-text leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
