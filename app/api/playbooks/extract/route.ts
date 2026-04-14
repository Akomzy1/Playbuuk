// app/api/playbooks/extract/route.ts
// POST /api/playbooks/extract — admin-only AI strategy extraction endpoint.
//
// Calls Claude API (claude-sonnet-4-6) with web_search tool to research
// the mentor's publicly available content and return a structured playbook.
//
// Body: { mentor_name, handle, markets, style? }
// Response: { playbook: ExtractedPlaybook }
// Errors: 401 | 403 | 400 | 500

import { NextResponse, type NextRequest } from 'next/server'
import { z }             from 'zod'
import { createClient }  from '@/lib/supabase/server'
import { extractPlaybook } from '@/lib/ai/extract'

const BodySchema = z.object({
  mentor_name: z.string().min(1).max(200),
  handle:      z.string().min(1).max(100),
  markets:     z.array(z.string().max(50)).min(1).max(10),
  style:       z.string().max(200).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { mentor_name, handle, markets, style } = parsed.data

  try {
    const playbook = await extractPlaybook(mentor_name, handle, markets, style)
    return NextResponse.json({ playbook })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    console.error('[playbooks/extract] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
