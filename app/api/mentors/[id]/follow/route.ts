// app/api/mentors/[id]/follow/route.ts
// Follow / unfollow a mentor.
//
// POST   /api/mentors/:id/follow  — follow the mentor
// DELETE /api/mentors/:id/follow  — unfollow the mentor
//
// Both routes return: { following: boolean, follower_count: number }
//
// follower_count is maintained by a Supabase DB trigger on mentor_follows
// (see prisma/schema.prisma header for the trigger SQL). We read the fresh
// count after the mutation rather than computing it ourselves.
//
// Errors:
//   401 — not authenticated
//   404 — mentor not found
//   409 — already following (POST only, handled gracefully)
//   500 — unexpected DB error

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

// ─── Shared: resolve mentor + current follow state ────────────────────────────

async function resolveContext(mentorId: string, userId: string) {
  const supabase = createClient()

  const { data: mentor, error: mentorErr } = await supabase
    .from('mentors')
    .select('id, follower_count')
    .eq('id', mentorId)
    .maybeSingle()

  if (mentorErr) throw new Error(mentorErr.message)
  if (!mentor) return { mentor: null, followRow: null, supabase }

  const { data: followRow } = await supabase
    .from('mentor_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('mentor_id', mentorId)
    .maybeSingle()

  return { mentor, followRow, supabase }
}

// ─── POST — follow ────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id: mentorId } = await context.params

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { mentor, followRow, supabase: sb } = await resolveContext(mentorId, user.id)

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    // Already following — idempotent success
    if (followRow) {
      return NextResponse.json({ following: true, follower_count: mentor.follower_count })
    }

    // Insert — DB trigger increments mentor.follower_count
    const { error: insertErr } = await sb
      .from('mentor_follows')
      .insert({ user_id: user.id, mentor_id: mentorId })

    if (insertErr) {
      // Unique constraint race condition — already followed
      if (insertErr.code === '23505') {
        return NextResponse.json({ following: true, follower_count: mentor.follower_count })
      }
      console.error('[follow] insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to follow mentor' }, { status: 500 })
    }

    // Read post-trigger count
    const { data: updated } = await sb
      .from('mentors')
      .select('follower_count')
      .eq('id', mentorId)
      .single()

    return NextResponse.json({
      following: true,
      follower_count: updated?.follower_count ?? mentor.follower_count + 1,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[follow] POST error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — unfollow ────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id: mentorId } = await context.params

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { mentor, followRow, supabase: sb } = await resolveContext(mentorId, user.id)

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    // Not following — idempotent success
    if (!followRow) {
      return NextResponse.json({ following: false, follower_count: mentor.follower_count })
    }

    // Delete — DB trigger decrements mentor.follower_count
    const { error: deleteErr } = await sb
      .from('mentor_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('mentor_id', mentorId)

    if (deleteErr) {
      console.error('[follow] delete error:', deleteErr.message)
      return NextResponse.json({ error: 'Failed to unfollow mentor' }, { status: 500 })
    }

    // Read post-trigger count
    const { data: updated } = await sb
      .from('mentors')
      .select('follower_count')
      .eq('id', mentorId)
      .single()

    return NextResponse.json({
      following: false,
      follower_count: updated?.follower_count ?? Math.max(0, mentor.follower_count - 1),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[follow] DELETE error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
