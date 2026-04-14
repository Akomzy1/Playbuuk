'use client'

// components/playbook/entry-exit-rules.tsx
// Detailed entry triggers and exit protocol for the mentor's strategy.
//
// Tier gating is handled by the parent — wrap this in <TierGate> in the page.
// This component always renders its full content; blur/overlay is TierGate's job.
//
// Psychology framing:
//   "Your entry triggers the plan. Your exit follows it."
//   Pre-filled SL/TP in the trade panel comes from these rules —
//   any deviation is logged as plan abandonment.

import { TrendingUp, TrendingDown, Target, StopCircle } from 'lucide-react'

// ─── RuleSection ─────────────────────────────────────────────────────────────

interface RuleSectionProps {
  title: string
  description: string
  rules: string[]
  icon: React.ElementType
  accentColor: string
  borderColor: string
  bgColor: string
}

function RuleSection({
  title, description, rules, icon: Icon,
  accentColor, borderColor, bgColor,
}: RuleSectionProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ background: bgColor, borderBottom: `1px solid ${borderColor}` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}1a`, border: `1px solid ${borderColor}` }}
        >
          <Icon size={13} style={{ color: accentColor }} aria-hidden="true" />
        </div>
        <div>
          <h3
            className="text-sm font-bold text-text"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h3>
          <p className="text-xs text-dim">{description}</p>
        </div>
      </div>

      <div className="flex flex-col" style={{ background: 'var(--card)' }}>
        {rules.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted italic">No rules defined yet.</p>
        ) : (
          rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 transition-colors duration-150"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}06` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              <span
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                style={{ background: accentColor, minWidth: '0.375rem' }}
                aria-hidden="true"
              />
              <p className="text-sm text-text leading-relaxed">{rule}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── EntryExitRules ───────────────────────────────────────────────────────────

interface EntryExitRulesProps {
  entryRules: string[]
  exitRules: string[]
}

export function EntryExitRules({ entryRules, exitRules }: EntryExitRulesProps) {
  return (
    <section aria-labelledby="entry-exit-heading" className="flex flex-col gap-4">
      <h2
        id="entry-exit-heading"
        className="text-sm font-bold text-text"
        style={{ letterSpacing: '-0.01em' }}
      >
        Entry &amp; Exit Rules
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <RuleSection
          title="Entry Triggers"
          description="Conditions that must ALL be true before entering."
          rules={entryRules}
          icon={TrendingUp}
          accentColor="var(--accent)"
          borderColor="rgba(0,229,176,0.18)"
          bgColor="rgba(0,229,176,0.07)"
        />
        <RuleSection
          title="Exit Protocol"
          description="How and when to close — follow the plan, not the feeling."
          rules={exitRules}
          icon={TrendingDown}
          accentColor="var(--danger)"
          borderColor="rgba(255,77,106,0.18)"
          bgColor="rgba(255,77,106,0.06)"
        />
      </div>

      {/* Discipline reminders */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(251,191,36,0.05)',
          border: '1px solid rgba(251,191,36,0.15)',
        }}
      >
        <Target
          size={13}
          style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}
          aria-hidden="true"
        />
        <p className="text-xs text-dim leading-relaxed">
          <span className="font-semibold" style={{ color: 'var(--gold)' }}>
            Discipline tip:{' '}
          </span>
          Your exit plan is set before you enter. Changing SL/TP mid-trade is plan abandonment.
          The trade panel pre-fills values from these rules — any deviation is logged.
        </p>
      </div>

      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(255,77,106,0.05)',
          border: '1px solid rgba(255,77,106,0.15)',
        }}
      >
        <StopCircle
          size={13}
          style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}
          aria-hidden="true"
        />
        <p className="text-xs text-dim leading-relaxed">
          <span className="font-semibold" style={{ color: 'var(--danger)' }}>
            Stop loss is not optional.{' '}
          </span>
          Every trade must have a defined stop. No SL = no trade.
          The system will not execute without one.
        </p>
      </div>
    </section>
  )
}
