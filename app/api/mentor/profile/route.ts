// app/api/mentor/profile/route.ts
//
// PATCH /api/mentor/profile
// Authenticated mentor updates their own profile fields on the Mentor model.
// Updatable: display_name, bio, avatar_emoji, markets, style,
//            signature, contact_info
//
// Note: preferred_pairs and session_preference are on the Playbook model
// and are updated via PATCH /api/playbooks/:id.

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

const PatchSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  bio:          z.string().max(1200).optional(),
  avatar_emoji: z.string().max(8).optional(),
  markets:      z.array(z.string().max(20)).max(10).optional(),
  style:        z.string().max(120).optional(),
  signature:    z.string().max(200).optional(),
  contact_info: z.string().max(500).optional(),
}).strict()

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mentor = await db.mentor.findUnique({
    where:  { user_id: user.id },
    select: { id: true },
  })
  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const updated = await db.mentor.update({
      where: { id: mentor.id },
      data:  parsed.data,
      select: {
        id:                true,
        display_name:      true,
        handle:            true,
        bio:               true,
        avatar_emoji:      true,
        markets:           true,
        style:             true,
        signature:         true,
        contact_info:      true,
        onboarding_status: true,
        stripe_connect_id: true,
      },
    })
    return NextResponse.json({ mentor: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[mentor/profile] PATCH error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
