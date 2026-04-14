// app/portal/layout.tsx
// Server Component layout for mentor portal routes.
//
// Gate:
//   1. Auth check — redirect /login if no session
//   2. Role check — only mentor + admin can access portal
//      (redirects traders to / with no error — they just don't have the link)
//   3. Fetches the mentor row linked to the logged-in user
//      (admin without a linked mentor sees the portal shell but the page
//       will handle the empty-mentor state itself)
//
// Renders PortalShell (client) which owns the sidebar collapse state and
// mobile nav, passing mentor identity data as props.

import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { db }             from '@/lib/db'
import { PortalShell }    from '@/components/portal/portal-shell'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Role gate ─────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
    redirect('/')
  }

  // ── Fetch linked mentor row ────────────────────────────────────────────────
  // user_id is nullable on Mentor (can be null for admin-added unclaimed mentors)
  const mentor = await db.mentor.findFirst({
    where:  { user_id: user.id },
    select: {
      id:           true,
      display_name: true,
      handle:       true,
      avatar_emoji: true,
      verified:     true,
    },
  })

  // ── Fallback for admin with no linked mentor ───────────────────────────────
  const mentorName   = mentor?.display_name ?? 'Mentor'
  const mentorHandle = mentor?.handle       ?? 'portal'
  const mentorEmoji  = mentor?.avatar_emoji ?? '🎯'
  const isVerified   = mentor?.verified     ?? false

  return (
    <PortalShell
      mentorName={mentorName}
      mentorHandle={mentorHandle}
      mentorEmoji={mentorEmoji}
      isVerified={isVerified}
    >
      {children}
    </PortalShell>
  )
}
