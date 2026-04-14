// app/api/mentors/route.ts
// GET /api/mentors — paginated, filterable mentor list.
//
// Query params:
//   search   — case-insensitive partial match on display_name or handle
//   market   — filter by market string in the JSONB markets array (e.g. "Forex")
//   style    — case-insensitive match on trading style (e.g. "ICT", "swing")
//   verified — "true" | "false"
//   sort     — "followers" | "rating" | "newest"  (default: "followers")
//   page     — 1-indexed  (default: 1)
//   limit    — max 48     (default: 12)
//
// Response: { mentors: MentorListItem[], total: number, page: number, totalPages: number }
//
// Requires auth. Uses Prisma for all DB queries, Supabase for auth only.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ─── Response type ────────────────────────────────────────────────────────────

export interface MentorListItem {
  id: string
  display_name: string
  handle: string
  bio: string | null
  avatar_emoji: string | null
  markets: string[]
  style: string | null
  follower_count: number
  external_followers: string | null
  rating: number | null
  review_count: number
  verified: boolean
  onboarding_status: string
  is_ai_draft: boolean
  playbook_id: string | null
  strategy_name: string | null
}

// ─── Query param schema ───────────────────────────────────────────────────────

const QuerySchema = z.object({
  search:   z.string().trim().max(100).default(''),
  market:   z.string().trim().max(80).default(''),
  style:    z.string().trim().max(80).default(''),
  verified: z.enum(['true', 'false', '']).default(''),
  sort:     z.enum(['followers', 'rating', 'newest']).default('followers'),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(48).default(12),
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

  const { search, market, style, verified, sort, page, limit } = parsed.data
  const offset = (page - 1) * limit

  try {
    // ── Build Prisma where clause ────────────────────────────────────────────
    const where: Prisma.MentorWhereInput = {
      // Never show mentors that are purely admin-added with no playbook yet
      NOT: { onboarding_status: 'admin_added' },
    }

    if (search) {
      where.OR = [
        { display_name: { contains: search, mode: 'insensitive' } },
        { handle: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (style) {
      where.style = { contains: style, mode: 'insensitive' }
    }

    if (verified === 'true')  where.verified = true
    if (verified === 'false') where.verified = false

    // JSONB array containment — string_contains checks if the JSON serialisation
    // includes the market token. Sufficient for controlled enum values (Forex,
    // Indices, Crypto…). A proper @> query would need $queryRaw.
    if (market) {
      where.markets = { string_contains: market }
    }

    // ── Build orderBy ────────────────────────────────────────────────────────
    let orderBy: Prisma.MentorOrderByWithRelationInput
    switch (sort) {
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'newest':
        orderBy = { created_at: 'desc' }
        break
      case 'followers':
      default:
        orderBy = { follower_count: 'desc' }
        break
    }

    // ── Execute queries in parallel ──────────────────────────────────────────
    const [mentors, total] = await Promise.all([
      db.mentor.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          display_name: true,
          handle: true,
          bio: true,
          avatar_emoji: true,
          markets: true,
          style: true,
          follower_count: true,
          external_followers: true,
          rating: true,
          review_count: true,
          verified: true,
          onboarding_status: true,
          playbooks: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              id: true,
              strategy_name: true,
              is_ai_draft: true,
            },
          },
        },
      }),
      db.mentor.count({ where }),
    ])

    // ── Shape response ────────────────────────────────────────────────────────
    const items: MentorListItem[] = mentors.map((m) => {
      const playbook = m.playbooks[0] ?? null
      return {
        id: m.id,
        display_name: m.display_name,
        handle: m.handle,
        bio: m.bio,
        avatar_emoji: m.avatar_emoji,
        markets: Array.isArray(m.markets) ? (m.markets as string[]) : [],
        style: m.style,
        follower_count: m.follower_count,
        external_followers: m.external_followers,
        rating: m.rating !== null ? Number(m.rating) : null,
        review_count: m.review_count,
        verified: m.verified,
        onboarding_status: m.onboarding_status,
        is_ai_draft: playbook?.is_ai_draft ?? true,
        playbook_id: playbook?.id ?? null,
        strategy_name: playbook?.strategy_name ?? null,
      }
    })

    return NextResponse.json({
      mentors: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[mentors] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
