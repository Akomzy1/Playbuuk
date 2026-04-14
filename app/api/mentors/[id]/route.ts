// app/api/mentors/[id]/route.ts
// GET /api/mentors/:id — full mentor profile + tier-gated playbook.
//
// Response shape by tier:
//   Free → mentor + playbook preview:
//            strategy_name, summary, timeframes, core_concepts,
//            golden_rules, common_mistakes, preferred_pairs, session_preference,
//            is_verified, is_ai_draft, version, published_at, updated_at
//   Pro  → all preview fields +
//            entry_rules, exit_rules, checklist, risk_management, indicators
//
// Errors: 401 Unauthorised | 404 Mentor not found | 500 Internal

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkTierAccess } from '@/lib/auth/tierGate'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> }

// Preview fields available to all tiers
type PlaybookPreview = {
  id: string
  strategy_name: string
  summary: string | null
  timeframes: unknown
  core_concepts: unknown
  golden_rules: unknown
  common_mistakes: unknown
  preferred_pairs: unknown
  session_preference: string | null
  is_verified: boolean
  is_ai_draft: boolean
  version: number
  published_at: Date | null
  updated_at: Date
}

// Pro-only additions
type PlaybookPro = PlaybookPreview & {
  entry_rules: unknown
  exit_rules: unknown
  checklist: unknown
  risk_management: unknown
  indicators: unknown
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: mentorId } = await context.params

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    // ── Fetch mentor + user profile in parallel ───────────────────────────
    const [mentor, profile] = await Promise.all([
      db.mentor.findUnique({
        where: { id: mentorId },
        select: {
          id: true,
          display_name: true,
          handle: true,
          bio: true,
          avatar_emoji: true,
          markets: true,
          style: true,
          signature: true,
          follower_count: true,
          external_followers: true,
          rating: true,
          review_count: true,
          verified: true,
          verified_at: true,
          onboarding_status: true,
          created_at: true,
        },
      }),
      db.profile.findUnique({
        where: { id: user.id },
        select: { tier: true },
      }),
    ])

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    const userTier = profile?.tier ?? 'free'
    const isPro    = checkTierAccess(userTier, 'pro')

    // ── Fetch latest playbook ─────────────────────────────────────────────
    const rawPlaybook = await db.playbook.findFirst({
      where: { mentor_id: mentorId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        strategy_name: true,
        summary: true,
        timeframes: true,
        core_concepts: true,
        golden_rules: true,
        common_mistakes: true,
        preferred_pairs: true,
        session_preference: true,
        is_verified: true,
        is_ai_draft: true,
        version: true,
        published_at: true,
        updated_at: true,
        // Pro-only fields — always fetched from DB, stripped below if free
        entry_rules: true,
        exit_rules: true,
        checklist: true,
        risk_management: true,
        indicators: true,
      },
    })

    // ── Build tier-gated playbook payload ─────────────────────────────────
    let playbook: PlaybookPreview | PlaybookPro | null = null

    if (rawPlaybook) {
      const preview: PlaybookPreview = {
        id: rawPlaybook.id,
        strategy_name: rawPlaybook.strategy_name,
        summary: rawPlaybook.summary,
        timeframes: rawPlaybook.timeframes,
        core_concepts: rawPlaybook.core_concepts,
        golden_rules: rawPlaybook.golden_rules,
        common_mistakes: rawPlaybook.common_mistakes,
        preferred_pairs: rawPlaybook.preferred_pairs,
        session_preference: rawPlaybook.session_preference,
        is_verified: rawPlaybook.is_verified,
        is_ai_draft: rawPlaybook.is_ai_draft,
        version: rawPlaybook.version,
        published_at: rawPlaybook.published_at,
        updated_at: rawPlaybook.updated_at,
      }

      if (isPro) {
        playbook = {
          ...preview,
          entry_rules: rawPlaybook.entry_rules,
          exit_rules: rawPlaybook.exit_rules,
          checklist: rawPlaybook.checklist,
          risk_management: rawPlaybook.risk_management,
          indicators: rawPlaybook.indicators,
        }
      } else {
        playbook = preview
      }
    }

    return NextResponse.json({
      mentor: {
        ...mentor,
        rating: mentor.rating !== null ? Number(mentor.rating) : null,
        markets: Array.isArray(mentor.markets) ? mentor.markets : [],
      },
      playbook,
      user_tier: userTier,
      is_pro: isPro,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[mentors][id] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
