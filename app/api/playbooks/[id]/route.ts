// app/api/playbooks/[id]/route.ts
// GET /api/playbooks/:id — single playbook with tier-gated content.
//
// Free tier response includes:
//   id, mentor_id, strategy_name, summary, timeframes, core_concepts,
//   golden_rules, common_mistakes, preferred_pairs, session_preference,
//   is_verified, is_ai_draft, version, published_at, updated_at
//   + denormalised mentor stub
//
// Pro tier additionally includes:
//   entry_rules, exit_rules, checklist, risk_management, indicators
//
// Errors: 401 Unauthorised | 404 Not found | 500 Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z }               from 'zod'
import { createClient }    from '@/lib/supabase/server'
import { checkTierAccess, tierGateError } from '@/lib/auth/tierGate'
import { db }              from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> }

type MentorStub = {
  id: string
  display_name: string
  handle: string
  avatar_emoji: string | null
  verified: boolean
  follower_count: number
  rating: number | null
  style: string | null
  markets: unknown
}

type PlaybookBase = {
  id: string
  mentor_id: string
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
  mentor: MentorStub
}

type PlaybookFull = PlaybookBase & {
  entry_rules: unknown
  exit_rules: unknown
  checklist: unknown
  risk_management: unknown
  indicators: unknown
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: playbookId } = await context.params

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    // ── Fetch playbook + user profile in parallel ──────────────────────────
    const [rawPlaybook, profile] = await Promise.all([
      db.playbook.findUnique({
        where: { id: playbookId },
        select: {
          id: true,
          mentor_id: true,
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
          // Pro-only — always fetched from DB; conditionally included in response
          entry_rules: true,
          exit_rules: true,
          checklist: true,
          risk_management: true,
          indicators: true,
          mentor: {
            select: {
              id: true,
              display_name: true,
              handle: true,
              avatar_emoji: true,
              verified: true,
              follower_count: true,
              rating: true,
              style: true,
              markets: true,
              onboarding_status: true,
            },
          },
        },
      }),
      db.profile.findUnique({
        where: { id: user.id },
        select: { tier: true },
      }),
    ])

    if (!rawPlaybook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }

    // Mentors still in admin_added state are not yet publicly visible
    if (rawPlaybook.mentor.onboarding_status === 'admin_added') {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }

    const userTier = profile?.tier ?? 'free'
    const isPro    = checkTierAccess(userTier, 'pro')

    // ── Mentor stub ───────────────────────────────────────────────────────
    const mentor: MentorStub = {
      id: rawPlaybook.mentor.id,
      display_name: rawPlaybook.mentor.display_name,
      handle: rawPlaybook.mentor.handle,
      avatar_emoji: rawPlaybook.mentor.avatar_emoji,
      verified: rawPlaybook.mentor.verified,
      follower_count: rawPlaybook.mentor.follower_count,
      rating: rawPlaybook.mentor.rating !== null ? Number(rawPlaybook.mentor.rating) : null,
      style: rawPlaybook.mentor.style,
      markets: rawPlaybook.mentor.markets,
    }

    // ── Tier-gated playbook payload ───────────────────────────────────────
    const base: PlaybookBase = {
      id: rawPlaybook.id,
      mentor_id: rawPlaybook.mentor_id,
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
      mentor,
    }

    const playbook: PlaybookBase | PlaybookFull = isPro
      ? {
          ...base,
          entry_rules: rawPlaybook.entry_rules,
          exit_rules: rawPlaybook.exit_rules,
          checklist: rawPlaybook.checklist,
          risk_management: rawPlaybook.risk_management,
          indicators: rawPlaybook.indicators,
        }
      : base

    return NextResponse.json({
      playbook,
      user_tier: userTier,
      is_pro: isPro,
      // Pro gate info so clients can show the right UpgradePrompt
      ...(!isPro && { pro_gate: tierGateError('live_checklist') }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[playbooks][id] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/playbooks/:id — mentor updates their own playbook ──────────────
//
// Mentor can only edit a playbook where playbooks.mentor_id = their mentor row.
// Admin users can edit any playbook.
//
// Partial updates — only fields present in the body are changed.
// Special action: { submit_for_review: true }
//   → sets is_ai_draft = false, mentor.onboarding_status = 'under_review',
//     published_at = now() (if not already set)
//
// Response: { playbook: { id, updated_at } }
// Errors: 401 | 403 Not your playbook | 400 Invalid body | 404 | 500

const ChecklistItemSchema = z.object({
  id:       z.string().min(1),
  item:     z.string().min(1).max(400),
  category: z.string().max(60),
  weight:   z.number().int().min(1).max(5),
  auto:     z.boolean(),
  evalKey:  z.string().max(60).nullable(),
})

const RiskSchema = z.object({
  risk_per_trade_pct: z.number().min(0.1).max(10).optional(),
  rr_ratio:           z.number().min(0.5).max(20).optional(),
  max_daily_loss_pct: z.number().min(0.1).max(50).optional(),
  max_lot_size:       z.number().min(0.01).max(100).optional(),
  preferred_lot_size: z.number().min(0.01).max(100).optional(),
})

const StringArrayField = z.array(z.string().max(500)).max(30)

const PatchBodySchema = z.object({
  strategy_name:      z.string().min(1).max(200).optional(),
  summary:            z.string().max(3000).nullable().optional(),
  timeframes:         z.array(z.string().max(10)).max(10).optional(),
  session_preference: z.string().max(100).nullable().optional(),
  core_concepts:      StringArrayField.optional(),
  entry_rules:        StringArrayField.optional(),
  exit_rules:         StringArrayField.optional(),
  indicators:         StringArrayField.optional(),
  golden_rules:       StringArrayField.optional(),
  common_mistakes:    StringArrayField.optional(),
  preferred_pairs:    z.array(z.string().max(12)).max(20).optional(),
  risk_management:    RiskSchema.optional(),
  checklist:          z.array(ChecklistItemSchema).max(40).optional(),
  submit_for_review:  z.boolean().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: playbookId } = await context.params

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PatchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    submit_for_review,
    risk_management,
    checklist,
    ...scalarUpdates
  } = parsed.data

  try {
    // ── Verify ownership ───────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Mentors can only edit their own playbook
    let mentorId: string | null = null
    if (!isAdmin) {
      const mentor = await db.mentor.findFirst({
        where:  { user_id: user.id },
        select: { id: true },
      })
      if (!mentor) {
        return NextResponse.json({ error: 'No mentor profile linked' }, { status: 403 })
      }
      mentorId = mentor.id
    }

    const playbook = await db.playbook.findUnique({
      where:  { id: playbookId },
      select: { id: true, mentor_id: true, published_at: true },
    })

    if (!playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }

    if (!isAdmin && playbook.mentor_id !== mentorId) {
      return NextResponse.json({ error: 'Not your playbook' }, { status: 403 })
    }

    // ── Build update payload ───────────────────────────────────────────────
    const updateData: Record<string, unknown> = { ...scalarUpdates }

    if (risk_management !== undefined) {
      updateData.risk_management = risk_management
    }
    if (checklist !== undefined) {
      updateData.checklist = checklist
    }
    if (submit_for_review) {
      updateData.is_ai_draft   = false
      updateData.published_at  = playbook.published_at ?? new Date()
    }

    // ── Update playbook ────────────────────────────────────────────────────
    const updated = await db.playbook.update({
      where:  { id: playbookId },
      data:   updateData,
      select: { id: true, updated_at: true, is_ai_draft: true },
    })

    // ── Update mentor status when submitting for review ────────────────────
    if (submit_for_review && mentorId) {
      await db.mentor.update({
        where: { id: mentorId },
        data:  { onboarding_status: 'under_review' },
      })
    }
    // Admin submitting on behalf — find the mentor from the playbook
    if (submit_for_review && isAdmin) {
      await db.mentor.updateMany({
        where: { id: playbook.mentor_id },
        data:  { onboarding_status: 'under_review' },
      })
    }

    return NextResponse.json({ playbook: updated })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[playbooks][id] PATCH error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
