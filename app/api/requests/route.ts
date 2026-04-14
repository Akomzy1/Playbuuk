// app/api/requests/route.ts
//
// GET  /api/requests        — list all requests sorted by vote_count DESC
//                             includes `user_voted` boolean if caller is authed
// POST /api/requests        — create a new mentor request
//                             checks for duplicate handle (case-insensitive)
//
// Errors: 401 | 400 | 409 (duplicate) | 500

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const requests = await db.mentorRequest.findMany({
      orderBy: [
        { vote_count: 'desc' },
        { created_at: 'asc'  },
      ],
      select: {
        id:            true,
        mentor_name:   true,
        mentor_handle: true,
        markets:       true,
        vote_count:    true,
        status:        true,
        created_at:    true,
      },
    })

    // If authed, fetch which requests this user has already voted on
    let votedIds = new Set<string>()
    if (user) {
      const votes = await db.mentorRequestVote.findMany({
        where:  { user_id: user.id },
        select: { request_id: true },
      })
      votedIds = new Set(votes.map(v => v.request_id))
    }

    const serialised = requests.map(r => ({
      id:            r.id,
      mentor_name:   r.mentor_name,
      mentor_handle: r.mentor_handle,
      markets:       Array.isArray(r.markets) ? (r.markets as string[]) : [],
      vote_count:    r.vote_count,
      status:        r.status,
      created_at:    r.created_at.toISOString(),
      user_voted:    votedIds.has(r.id),
    }))

    return NextResponse.json({ requests: serialised })
  } catch (err) {
    console.error('[requests] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  mentor_name:   z.string().min(1).max(200).trim(),
  mentor_handle: z.string().min(1).max(100).trim(),
  markets:       z.array(z.string().max(50)).min(1).max(8),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { mentor_name, mentor_handle, markets } = parsed.data
  const normalHandle = mentor_handle.toLowerCase().replace(/^@/, '')

  try {
    // ── Duplicate check (case-insensitive handle) ──────────────────────────
    const existing = await db.mentorRequest.findFirst({
      where: {
        mentor_handle: { equals: normalHandle, mode: 'insensitive' },
      },
      select: { id: true, vote_count: true, status: true },
    })

    if (existing) {
      return NextResponse.json(
        {
          error:      'A request for this mentor already exists',
          request_id: existing.id,
          vote_count: existing.vote_count,
          status:     existing.status,
        },
        { status: 409 },
      )
    }

    // ── Also check if this mentor is already on the platform ───────────────
    const alreadyAdded = await db.mentor.findFirst({
      where: { handle: { equals: normalHandle, mode: 'insensitive' } },
      select: { id: true },
    })
    if (alreadyAdded) {
      return NextResponse.json(
        { error: 'This mentor is already on Playbuuk' },
        { status: 409 },
      )
    }

    const newRequest = await db.mentorRequest.create({
      data: {
        mentor_name,
        mentor_handle:  normalHandle,
        markets,
        requested_by:   user.id,
        vote_count:     1,             // creator's implicit first vote
        status:         'open',
      },
      select: {
        id:            true,
        mentor_name:   true,
        mentor_handle: true,
        markets:       true,
        vote_count:    true,
        status:        true,
        created_at:    true,
      },
    })

    // Record creator's vote
    await db.mentorRequestVote.create({
      data: { request_id: newRequest.id, user_id: user.id },
    })

    return NextResponse.json({
      request: {
        ...newRequest,
        markets:    Array.isArray(newRequest.markets) ? newRequest.markets : [],
        created_at: newRequest.created_at.toISOString(),
        user_voted: true,
      },
    }, { status: 201 })

  } catch (err) {
    console.error('[requests] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
