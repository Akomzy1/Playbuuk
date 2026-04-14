// app/api/admin/requests/route.ts
//
// PATCH /api/admin/requests — admin updates request status + optional notes
//
// Body: { request_id, status, admin_notes? }
// Response: { request: { id, status, admin_notes } }
// Errors: 401 | 403 | 400 | 404 | 500

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

const PatchSchema = z.object({
  request_id:  z.string().uuid(),
  status:      z.enum(['open', 'in_progress', 'added', 'declined']),
  admin_notes: z.string().max(1000).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { request_id, status, admin_notes } = parsed.data

  try {
    const existing = await db.mentorRequest.findUnique({
      where: { id: request_id }, select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.mentorRequest.update({
      where:  { id: request_id },
      data:   {
        status,
        ...(admin_notes !== undefined ? { admin_notes } : {}),
        updated_at: new Date(),
      },
      select: { id: true, status: true, admin_notes: true },
    })

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('[admin/requests] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
