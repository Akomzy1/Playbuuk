// app/api/admin/add-mentor/route.ts
// POST /api/admin/add-mentor — create a new unverified mentor + AI-extracted playbook.
//
// Flow:
//   1. Validate admin role
//   2. Create mentor row (user_id=null, onboarding_status='admin_added')
//   3. Create mentor_escrow record
//   4. Create playbook from provided extracted data (is_ai_draft=true)
//
// Note: AI extraction is called separately by the client via /api/playbooks/extract
// before calling this endpoint. This keeps the add flow async/progressive.
//
// Body: { mentor_name, handle, markets, style?, bio?, contact_info?, avatar_emoji?,
//         external_followers?, playbook: ExtractedPlaybook }
// Response: { mentor_id, playbook_id }

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

const ChecklistItemSchema = z.object({
  id:       z.string().min(1),
  item:     z.string().min(1).max(400),
  category: z.string().max(60),
  weight:   z.number().int().min(1).max(5),
  auto:     z.boolean(),
  evalKey:  z.string().max(60).nullable(),
})

const RiskSchema = z.object({
  risk_per_trade_pct: z.number().nullable().optional(),
  rr_ratio:           z.number().nullable().optional(),
  max_daily_loss_pct: z.number().nullable().optional(),
  max_lot_size:       z.number().nullable().optional(),
  preferred_lot_size: z.number().nullable().optional(),
})

const PlaybookDataSchema = z.object({
  strategy_name:      z.string().min(1).max(200),
  summary:            z.string().nullable().optional(),
  timeframes:         z.array(z.string().max(10)).max(10),
  session_preference: z.string().nullable().optional(),
  core_concepts:      z.array(z.string().max(500)).max(30),
  entry_rules:        z.array(z.string().max(500)).max(30),
  exit_rules:         z.array(z.string().max(500)).max(30),
  indicators:         z.array(z.string().max(500)).max(30),
  golden_rules:       z.array(z.string().max(500)).max(30),
  common_mistakes:    z.array(z.string().max(500)).max(30),
  preferred_pairs:    z.array(z.string().max(12)).max(20),
  risk_management:    RiskSchema.optional(),
  checklist:          z.array(ChecklistItemSchema).max(40),
})

const BodySchema = z.object({
  mentor_name:         z.string().min(1).max(200),
  handle:              z.string().min(1).max(100),
  markets:             z.array(z.string().max(50)).min(1).max(10),
  style:               z.string().max(200).nullable().optional(),
  bio:                 z.string().max(2000).nullable().optional(),
  contact_info:        z.string().max(500).nullable().optional(),
  avatar_emoji:        z.string().max(10).optional(),
  external_followers:  z.string().max(100).nullable().optional(),
  playbook:            PlaybookDataSchema,
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    mentor_name, handle, markets, style, bio, contact_info,
    avatar_emoji, external_followers, playbook: pb,
  } = parsed.data

  try {
    // ── Check for duplicate handle ─────────────────────────────────────────
    const existing = await db.mentor.findFirst({
      where:  { handle },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: `A mentor with handle "@${handle}" already exists` },
        { status: 409 },
      )
    }

    // ── Create mentor ──────────────────────────────────────────────────────
    const mentor = await db.mentor.create({
      data: {
        user_id:            null,
        display_name:       mentor_name,
        handle,
        bio:                bio ?? null,
        avatar_emoji:       avatar_emoji ?? '🎯',
        markets,
        style:              style ?? null,
        contact_info:       contact_info ?? null,
        external_followers: external_followers ?? null,
        onboarding_status:  'admin_added',
        verified:           false,
        added_by:           user.id,
        follower_count:     0,
      },
      select: { id: true },
    })

    // ── Create mentor_escrow record ────────────────────────────────────────
    await db.mentorEscrow.create({
      data: {
        mentor_id:            mentor.id,
        total_accrued:        0,
        last_calculated_at:   new Date(),
        released:             false,
      },
    })

    // ── Create playbook ────────────────────────────────────────────────────
    const playbookRecord = await db.playbook.create({
      data: {
        mentor_id:          mentor.id,
        strategy_name:      pb.strategy_name,
        summary:            pb.summary ?? null,
        timeframes:         pb.timeframes,
        session_preference: pb.session_preference ?? null,
        core_concepts:      pb.core_concepts,
        entry_rules:        pb.entry_rules,
        exit_rules:         pb.exit_rules,
        indicators:         pb.indicators,
        golden_rules:       pb.golden_rules,
        common_mistakes:    pb.common_mistakes,
        preferred_pairs:    pb.preferred_pairs,
        risk_management:    pb.risk_management ?? {},
        checklist:          pb.checklist,
        is_ai_draft:        true,
        is_verified:        false,
        version:            1,
        published_at:       new Date(),
      },
      select: { id: true },
    })

    return NextResponse.json({
      mentor_id:   mentor.id,
      playbook_id: playbookRecord.id,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/add-mentor] error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
