// app/api/admin/pipeline/route.ts
// GET  /api/admin/pipeline — list all mentors with escrow data for pipeline view
// PATCH /api/admin/pipeline — update mentor onboarding_status

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

async function assertAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const supabase = createClient()
  if (!await assertAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch all mentors with escrow in one go
    const mentors = await db.mentor.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id:                 true,
        display_name:       true,
        handle:             true,
        avatar_emoji:       true,
        markets:            true,
        style:              true,
        follower_count:     true,
        external_followers: true,
        contact_info:       true,
        onboarding_status:  true,
        verified:           true,
        created_at:         true,
        escrow: {
          select: { total_accrued: true, released: true },
        },
        playbooks: {
          select: { id: true },
          take: 1,
        },
      },
    })

    const serialised = mentors.map(m => ({
      id:                 m.id,
      display_name:       m.display_name,
      handle:             m.handle,
      avatar_emoji:       m.avatar_emoji ?? '🎯',
      markets:            Array.isArray(m.markets) ? m.markets : [],
      style:              m.style,
      follower_count:     m.follower_count,
      external_followers: m.external_followers,
      contact_info:       m.contact_info,
      onboarding_status:  m.onboarding_status,
      verified:           m.verified,
      created_at:         m.created_at.toISOString(),
      escrow:             (m.escrow && !m.escrow.released)
        ? Number(m.escrow.total_accrued)
        : 0,
      has_playbook:       m.playbooks.length > 0,
    }))

    return NextResponse.json({ mentors: serialised })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/pipeline] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const PatchSchema = z.object({
  mentor_id:         z.string().uuid(),
  onboarding_status: z.enum([
    'admin_added','draft_ready','invitation_sent','under_review','verified','withdrawn',
  ]),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  if (!await assertAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })
  }

  const { mentor_id, onboarding_status } = parsed.data

  try {
    const updated = await db.mentor.update({
      where: { id: mentor_id },
      data:  {
        onboarding_status,
        ...(onboarding_status === 'verified' ? {
          verified:    true,
          verified_at: new Date(),
        } : {}),
      },
      select: { id: true, onboarding_status: true, verified: true },
    })
    return NextResponse.json({ mentor: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/pipeline] PATCH error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
