// app/portal/playbook/page.tsx
// Mentor portal — playbook editor page.
//
// Server component: auth check, mentor lookup, fetch playbook, then render
// the PlaybookEditor client component with serialized props.
//
// Edge cases:
//   • Mentor has no playbook yet           — show "Coming Soon / Request" state
//   • Admin with no linked mentor          — show info banner, no editor
//   • Playbook exists but is not yet live  — still editable (is_ai_draft or under_review)

import type { Metadata }    from 'next'
import { redirect }         from 'next/navigation'
import { createClient }     from '@/lib/supabase/server'
import { db }               from '@/lib/db'
import { PlaybookEditor }   from '@/components/portal/playbook-editor'
import type { ChecklistItem } from '@/components/portal/checklist-editor'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'My Playbook — Mentor Portal | Playbuuk',
  description: 'Review, edit, and submit your trading strategy playbook for verification on Playbuuk.',
  robots:      { index: false, follow: false },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlaybookPage() {
  const supabase = createClient()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Role gate ─────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
    redirect('/')
  }

  // ── Mentor row ────────────────────────────────────────────────────────────
  const mentor = await db.mentor.findFirst({
    where:  { user_id: user.id },
    select: {
      id:                true,
      display_name:      true,
      onboarding_status: true,
    },
  })

  // ── Admin without linked mentor ───────────────────────────────────────────
  if (!mentor) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl px-6 py-8 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-base font-bold text-text mb-2">No Mentor Profile Linked</p>
          <p className="text-sm text-muted">
            Your admin account is not linked to a mentor row. To edit a playbook,
            link a mentor profile via the admin panel.
          </p>
        </div>
      </div>
    )
  }

  // ── Playbook ──────────────────────────────────────────────────────────────
  const playbook = await db.playbook.findFirst({
    where:  { mentor_id: mentor.id },
    select: {
      id:                 true,
      strategy_name:      true,
      summary:            true,
      timeframes:         true,
      session_preference: true,
      core_concepts:      true,
      entry_rules:        true,
      exit_rules:         true,
      indicators:         true,
      golden_rules:       true,
      common_mistakes:    true,
      preferred_pairs:    true,
      checklist:          true,
      risk_management:    true,
      is_ai_draft:        true,
      is_verified:        true,
      updated_at:         true,
    },
    orderBy: { updated_at: 'desc' },
  })

  // ── No playbook yet ───────────────────────────────────────────────────────
  if (!playbook) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl px-6 py-10 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-4xl mb-4"
            aria-hidden="true"
          >📖</p>
          <p className="text-base font-bold text-text mb-2">No Playbook Yet</p>
          <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
            Your playbook hasn't been created yet. The Playbuuk team will generate an AI draft of
            your strategy once your mentor profile is activated. Reach out via{' '}
            <a href="mailto:support@playbuuk.com" className="text-accent underline">support@playbuuk.com</a> if
            you're ready to get started.
          </p>
        </div>
      </div>
    )
  }

  // ── Serialize ─────────────────────────────────────────────────────────────
  // JSON fields come back as Prisma JsonValue (unknown). Cast carefully.
  function toStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string')
  }

  function toChecklist(v: unknown): ChecklistItem[] {
    if (!Array.isArray(v)) return []
    return v.filter((x): x is ChecklistItem =>
      x !== null &&
      typeof x === 'object' &&
      typeof (x as ChecklistItem).id   === 'string' &&
      typeof (x as ChecklistItem).item === 'string'
    )
  }

  function toRisk(v: unknown): {
    risk_per_trade_pct?: number
    rr_ratio?: number
    max_daily_loss_pct?: number
    max_lot_size?: number
    preferred_lot_size?: number
  } | null {
    if (!v || typeof v !== 'object') return null
    const r = v as Record<string, unknown>
    return {
      risk_per_trade_pct: typeof r.risk_per_trade_pct === 'number' ? r.risk_per_trade_pct : undefined,
      rr_ratio:           typeof r.rr_ratio           === 'number' ? r.rr_ratio           : undefined,
      max_daily_loss_pct: typeof r.max_daily_loss_pct === 'number' ? r.max_daily_loss_pct : undefined,
      max_lot_size:       typeof r.max_lot_size       === 'number' ? r.max_lot_size       : undefined,
      preferred_lot_size: typeof r.preferred_lot_size === 'number' ? r.preferred_lot_size : undefined,
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-text mb-1"
          style={{ letterSpacing: '-0.03em' }}
        >
          My Playbook
        </h1>
        <p className="text-sm text-muted">
          Review and edit your trading strategy. Traders see this content — keep it precise.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-2xs font-mono px-2 py-0.5 rounded"
            style={playbook.is_verified ? {
              background: 'rgba(0,229,176,0.08)',
              border:     '1px solid rgba(0,229,176,0.22)',
              color:      'var(--accent)',
            } : playbook.is_ai_draft ? {
              background: 'rgba(251,191,36,0.08)',
              border:     '1px solid rgba(251,191,36,0.22)',
              color:      'var(--gold)',
            } : {
              background: 'rgba(77,142,255,0.08)',
              border:     '1px solid rgba(77,142,255,0.22)',
              color:      '#4d8eff',
            }}
          >
            {playbook.is_verified
              ? '✓ Verified'
              : playbook.is_ai_draft
                ? 'AI Draft'
                : mentor.onboarding_status === 'under_review' ? 'Under Review' : 'Draft'
            }
          </span>
          <span className="text-2xs font-mono text-muted">
            Last updated {new Date(playbook.updated_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* ── Editor ────────────────────────────────────────────────────────── */}
      <PlaybookEditor
        playbookId={playbook.id}
        isAiDraft={playbook.is_ai_draft}
        onboardingStatus={mentor.onboarding_status}
        strategyName={playbook.strategy_name}
        summary={playbook.summary}
        timeframes={toStringArray(playbook.timeframes)}
        sessionPreference={playbook.session_preference}
        coreConcepts={toStringArray(playbook.core_concepts)}
        entryRules={toStringArray(playbook.entry_rules)}
        exitRules={toStringArray(playbook.exit_rules)}
        indicators={toStringArray(playbook.indicators)}
        goldenRules={toStringArray(playbook.golden_rules)}
        commonMistakes={toStringArray(playbook.common_mistakes)}
        preferredPairs={toStringArray(playbook.preferred_pairs)}
        checklist={toChecklist(playbook.checklist)}
        riskManagement={toRisk(playbook.risk_management)}
      />

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <p className="text-2xs font-mono text-muted text-center mt-8 leading-relaxed">
        Not financial advice. Trading carries substantial risk. Playbuuk mentor content is for
        educational purposes only.
      </p>
    </div>
  )
}
