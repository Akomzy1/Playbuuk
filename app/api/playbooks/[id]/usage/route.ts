// app/api/playbooks/[id]/usage/route.ts
// POST /api/playbooks/:id/usage — log a playbook usage event.
//
// Only Pro users generate billable usage events; free users receive 403.
// This data powers the monthly mentor revenue-share calculation.
//
// Point values (used by the monthly revenue calc job, not stored here):
//   checklist_open  → 1 pt
//   time_spent      → 1 pt per 5 min  (duration_seconds / 300, min 1)
//   trade_logged    → 2 pts
//   trade_executed  → 3 pts
//
// Request body (JSON):
//   { event_type: EventType, duration_seconds?: number }
//   duration_seconds is REQUIRED for time_spent, ignored for other events.
//
// Response:
//   { logged: true, event_type, points }
//
// Errors:
//   400 Invalid body (Zod)
//   401 Unauthorised
//   403 Pro subscription required
//   404 Playbook not found
//   500 Internal

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkTierAccess, tierGateError } from '@/lib/auth/tierGate'
import { db } from '@/lib/db'
import type { EventType } from '@prisma/client'

// ─── Request schema ───────────────────────────────────────────────────────────

const UsageBodySchema = z
  .object({
    event_type: z.enum([
      'checklist_open',
      'time_spent',
      'trade_logged',
      'trade_executed',
    ] as const),
    // Only meaningful for time_spent; must be a positive integer number of seconds
    duration_seconds: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.event_type === 'time_spent' && data.duration_seconds === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'duration_seconds is required for time_spent events',
        path: ['duration_seconds'],
      })
    }
  })

type UsageBody = z.infer<typeof UsageBodySchema>

// ─── Point calculator ─────────────────────────────────────────────────────────
// These are the same weights used by the monthly revenue calculation job.
// Returned in the response so clients can show instant feedback if needed.

function calculatePoints(eventType: EventType, durationSeconds?: number): number {
  switch (eventType) {
    case 'checklist_open':  return 1
    case 'time_spent':      return Math.max(1, Math.floor((durationSeconds ?? 0) / 300))
    case 'trade_logged':    return 2
    case 'trade_executed':  return 3
    default:                return 0
  }
}

// ─── Route context ────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: playbookId } = await context.params

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: UsageBody
  try {
    const raw = await request.json()
    const parsed = UsageBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: z.flattenError(parsed.error) },
        { status: 400 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  try {
    // ── Tier check + playbook existence in parallel ────────────────────────
    const [profile, playbook] = await Promise.all([
      db.profile.findUnique({
        where: { id: user.id },
        select: { tier: true },
      }),
      db.playbook.findUnique({
        where: { id: playbookId },
        select: {
          id: true,
          mentor: { select: { onboarding_status: true } },
        },
      }),
    ])

    // ── Playbook visibility check ─────────────────────────────────────────
    if (!playbook || playbook.mentor.onboarding_status === 'admin_added') {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }

    // ── Pro tier required — free users do not generate usage events ───────
    const userTier = profile?.tier ?? 'free'
    if (!checkTierAccess(userTier, 'pro')) {
      return NextResponse.json(
        tierGateError('live_checklist'),
        { status: 403 },
      )
    }

    // ── Log the event ─────────────────────────────────────────────────────
    await db.playbookUsage.create({
      data: {
        user_id: user.id,
        playbook_id: playbookId,
        event_type: body.event_type,
        // Only stored on time_spent events; null for others
        duration_seconds:
          body.event_type === 'time_spent' ? (body.duration_seconds ?? null) : null,
      },
    })

    const points = calculatePoints(body.event_type, body.duration_seconds)

    return NextResponse.json({ logged: true, event_type: body.event_type, points }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[playbooks][id][usage] POST error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
