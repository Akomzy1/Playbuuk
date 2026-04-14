// app/api/requests/[id]/vote/route.ts
//
// POST   /api/requests/:id/vote  — cast a vote (unique per user per request)
// DELETE /api/requests/:id/vote  — remove a vote
//
// Both return: { vote_count: number, user_voted: boolean }
//
// The vote_count on mentor_requests is maintained manually here.
// A DB trigger could do this, but we keep it explicit for clarity.
//
// Errors: 401 | 404 | 409 (already voted) | 500

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST — add vote ──────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id: requestId } = await context.params

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    // Verify request exists
    const req = await db.mentorRequest.findUnique({
      where:  { id: requestId },
      select: { id: true, vote_count: true, status: true },
    })
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Check already voted
    const existing = await db.mentorRequestVote.findFirst({
      where: { request_id: requestId, user_id: user.id },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Already voted', vote_count: req.vote_count, user_voted: true },
        { status: 409 },
      )
    }

    // Create vote + increment count atomically
    const [, updated] = await db.$transaction([
      db.mentorRequestVote.create({
        data: { request_id: requestId, user_id: user.id },
      }),
      db.mentorRequest.update({
        where:  { id: requestId },
        data:   { vote_count: { increment: 1 } },
        select: { vote_count: true },
      }),
    ])

    return NextResponse.json({ vote_count: updated.vote_count, user_voted: true })

  } catch (err) {
    console.error('[requests/vote] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove vote ─────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id: requestId } = await context.params

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const voteRow = await db.mentorRequestVote.findFirst({
      where: { request_id: requestId, user_id: user.id },
    })
    if (!voteRow) {
      const req = await db.mentorRequest.findUnique({
        where:  { id: requestId },
        select: { vote_count: true },
      })
      return NextResponse.json({ vote_count: req?.vote_count ?? 0, user_voted: false })
    }

    const [, updated] = await db.$transaction([
      db.mentorRequestVote.delete({ where: { id: voteRow.id } }),
      db.mentorRequest.update({
        where:  { id: requestId },
        data:   { vote_count: { decrement: 1 } },
        select: { vote_count: true },
      }),
    ])

    return NextResponse.json({ vote_count: Math.max(0, updated.vote_count), user_voted: false })

  } catch (err) {
    console.error('[requests/vote] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
