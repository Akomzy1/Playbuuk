// app/api/playbooks/route.ts
// GET /api/playbooks — list playbooks (preview fields only, no Pro content).
//
// Query params:
//   mentor_id — filter to a specific mentor's playbooks
//   verified  — "true" | "false" — filter by is_verified flag
//   page      — 1-indexed (default: 1)
//   limit     — max 48 (default: 12)
//
// Returns preview-safe fields only regardless of tier.
// For full playbook content, use GET /api/playbooks/:id.
//
// Response: { playbooks: PlaybookListItem[], total, page, totalPages }
//
// Requires auth. Uses Prisma for all DB queries, Supabase for auth only.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ─── Response type ────────────────────────────────────────────────────────────

export interface PlaybookListItem {
  id: string
  mentor_id: string
  strategy_name: string
  summary: string | null
  timeframes: unknown
  preferred_pairs: unknown
  session_preference: string | null
  is_verified: boolean
  is_ai_draft: boolean
  version: number
  published_at: Date | null
  updated_at: Date
  // Denormalised mentor info for display
  mentor: {
    id: string
    display_name: string
    handle: string
    avatar_emoji: string | null
    verified: boolean
    follower_count: number
  }
}

// ─── Query param schema ───────────────────────────────────────────────────────

const QuerySchema = z.object({
  mentor_id: z.string().uuid().optional(),
  verified:  z.enum(['true', 'false', '']).default(''),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(48).default(12),
})

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse + validate query params ─────────────────────────────────────────
  const raw = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = QuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { mentor_id, verified, page, limit } = parsed.data
  const offset = (page - 1) * limit

  try {
    // ── Build where clause ────────────────────────────────────────────────
    const where: Prisma.PlaybookWhereInput = {
      // Only show playbooks whose mentors are publicly visible
      mentor: {
        NOT: { onboarding_status: 'admin_added' },
      },
    }

    if (mentor_id) where.mentor_id = mentor_id
    if (verified === 'true')  where.is_verified = true
    if (verified === 'false') where.is_verified = false

    // ── Execute queries in parallel ──────────────────────────────────────
    const [playbooks, total] = await Promise.all([
      db.playbook.findMany({
        where,
        orderBy: { published_at: { sort: 'desc', nulls: 'last' } },
        skip: offset,
        take: limit,
        select: {
          id: true,
          mentor_id: true,
          strategy_name: true,
          summary: true,
          timeframes: true,
          preferred_pairs: true,
          session_preference: true,
          is_verified: true,
          is_ai_draft: true,
          version: true,
          published_at: true,
          updated_at: true,
          mentor: {
            select: {
              id: true,
              display_name: true,
              handle: true,
              avatar_emoji: true,
              verified: true,
              follower_count: true,
            },
          },
        },
      }),
      db.playbook.count({ where }),
    ])

    // ── Shape response ────────────────────────────────────────────────────
    const items: PlaybookListItem[] = playbooks.map((p) => ({
      id: p.id,
      mentor_id: p.mentor_id,
      strategy_name: p.strategy_name,
      summary: p.summary,
      timeframes: p.timeframes,
      preferred_pairs: p.preferred_pairs,
      session_preference: p.session_preference,
      is_verified: p.is_verified,
      is_ai_draft: p.is_ai_draft,
      version: p.version,
      published_at: p.published_at,
      updated_at: p.updated_at,
      mentor: p.mentor,
    }))

    return NextResponse.json({ playbooks: items, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[playbooks] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
