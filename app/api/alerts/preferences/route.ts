// app/api/alerts/preferences/route.ts
//
// GET /api/alerts/preferences
//   Returns user's alert preferences + followed mentors list (for UI selectors).
//   Creates a default row if none exists yet.
//
// PUT /api/alerts/preferences
//   Upserts preferences. Accepts any subset of fields.
//   Also used by lib/alerts/push.ts to save the push_subscription object.

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch or create default preferences
  let prefs = await db.alertPreferences.findUnique({
    where: { user_id: user.id },
  })

  if (!prefs) {
    prefs = await db.alertPreferences.create({
      data: { user_id: user.id },
    })
  }

  // Fetch followed mentors for the UI selector
  const follows = await db.mentorFollow.findMany({
    where:  { user_id: user.id },
    select: {
      mentor: {
        select: {
          id:           true,
          display_name: true,
          handle:       true,
          avatar_emoji: true,
          verified:     true,
        },
      },
    },
    orderBy: { followed_at: 'asc' },
  })

  return NextResponse.json({
    preferences: {
      id:                  prefs.id,
      alert_threshold:     prefs.alert_threshold,
      alert_mentors:       prefs.alert_mentors     ?? null,
      alert_pairs:         prefs.alert_pairs        ?? null,
      alert_sessions:      prefs.alert_sessions     ?? null,
      quiet_hours_start:   prefs.quiet_hours_start  ?? null,
      quiet_hours_end:     prefs.quiet_hours_end    ?? null,
      push_enabled:        prefs.push_enabled,
      has_subscription:    prefs.push_subscription  !== null,
    },
    followed_mentors: follows.map(f => ({
      id:           f.mentor.id,
      display_name: f.mentor.display_name,
      handle:       f.mentor.handle,
      avatar_emoji: f.mentor.avatar_emoji,
      verified:     f.mentor.verified,
    })),
  })
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

const PutSchema = z.object({
  alert_threshold:   z.enum(['a_plus', 'b_plus', 'c_plus']).optional(),
  // Arrays of UUIDs / strings — null means "all"
  alert_mentors:     z.array(z.string().uuid()).nullable().optional(),
  alert_pairs:       z.array(z.string().min(1).max(20)).nullable().optional(),
  alert_sessions:    z.array(
    z.enum(['london', 'new_york', 'tokyo', 'sydney'])
  ).nullable().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quiet_hours_end:   z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  push_enabled:      z.boolean().optional(),
  // PushSubscription.toJSON() — {endpoint, keys: {p256dh, auth}}
  push_subscription: z.unknown().optional(),
})

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    alert_threshold, alert_mentors, alert_pairs, alert_sessions,
    quiet_hours_start, quiet_hours_end, push_enabled, push_subscription,
  } = parsed.data

  // Build update data — only include fields that were explicitly sent
  const data: Record<string, unknown> = {}
  if (alert_threshold   !== undefined) data.alert_threshold   = alert_threshold
  if (alert_mentors     !== undefined) data.alert_mentors     = alert_mentors
  if (alert_pairs       !== undefined) data.alert_pairs       = alert_pairs
  if (alert_sessions    !== undefined) data.alert_sessions    = alert_sessions
  if (quiet_hours_start !== undefined) data.quiet_hours_start = quiet_hours_start
  if (quiet_hours_end   !== undefined) data.quiet_hours_end   = quiet_hours_end
  if (push_enabled      !== undefined) data.push_enabled      = push_enabled
  if (push_subscription !== undefined) data.push_subscription = push_subscription

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const prefs = await db.alertPreferences.upsert({
    where:  { user_id: user.id },
    create: { user_id: user.id, ...data },
    update: data,
    select: {
      id:                true,
      alert_threshold:   true,
      alert_mentors:     true,
      alert_pairs:       true,
      alert_sessions:    true,
      quiet_hours_start: true,
      quiet_hours_end:   true,
      push_enabled:      true,
      push_subscription: true,
    },
  })

  return NextResponse.json({
    preferences: {
      ...prefs,
      push_subscription: undefined,          // never return the raw subscription object
      has_subscription:  prefs.push_subscription !== null,
    },
  })
}
