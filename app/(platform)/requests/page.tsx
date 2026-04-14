// app/(platform)/requests/page.tsx
// Public mentor request page — submit new requests and upvote existing ones.
//
// Server Component: fetches requests + user's vote state at render time.
// Passes to RequestsShell (client) for interactive voting + submission.

import type { Metadata }    from 'next'
import { createClient }     from '@/lib/supabase/server'
import { db }               from '@/lib/db'
import { RequestsShell }    from '@/components/requests/requests-shell'

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Request a Trading Mentor — Playbuuk',
  description: 'Vote for the trading mentors you want to see on Playbuuk. Most-voted mentors get added first. Request any forex, crypto, or indices mentor.',
  keywords:    ['request trading mentor', 'forex mentor request', 'trading strategy request', 'playbuuk mentor'],
  openGraph: {
    title:       'Request a Trading Mentor — Playbuuk',
    description: 'Help shape the Playbuuk mentor roster. Vote for strategies you want to follow.',
    type:        'website',
  },
  twitter: { card: 'summary_large_image' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestItem {
  id:            string
  mentor_name:   string
  mentor_handle: string
  markets:       string[]
  vote_count:    number
  status:        'open' | 'in_progress' | 'added' | 'declined'
  created_at:    string
  user_voted:    boolean
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all requests ordered by votes
  const rawRequests = await db.mentorRequest.findMany({
    where:   { status: { not: 'declined' } },
    orderBy: [{ vote_count: 'desc' }, { created_at: 'asc' }],
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

  // Fetch user's votes if logged in
  let votedIds = new Set<string>()
  if (user) {
    const votes = await db.mentorRequestVote.findMany({
      where:  { user_id: user.id },
      select: { request_id: true },
    })
    votedIds = new Set(votes.map(v => v.request_id))
  }

  const requests: RequestItem[] = rawRequests.map(r => ({
    id:            r.id,
    mentor_name:   r.mentor_name,
    mentor_handle: r.mentor_handle ?? '',
    markets:       Array.isArray(r.markets) ? (r.markets as string[]) : [],
    vote_count:    r.vote_count,
    status:        r.status as RequestItem['status'],
    created_at:    r.created_at.toISOString(),
    user_voted:    votedIds.has(r.id),
  }))

  return <RequestsShell initialRequests={requests} isAuthed={!!user} />
}
