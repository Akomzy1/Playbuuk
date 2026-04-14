// app/(platform)/layout.tsx
// Server Component layout for all authenticated platform routes.
//
// Responsibilities:
//   1. Verify auth on the server — redirect to /login if no session
//      (middleware also guards this, but belt-and-suspenders)
//   2. Pre-fetch the user's profile row so the client AppShell has no loading
//      flash — it receives data immediately on first paint
//   3. Wrap children in AppShell (client component) which owns the sidebar,
//      mobile nav, and Zustand store hydration

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { UserProfile } from '@/stores/user-store'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Verify auth — getUser() validates the JWT against Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Pre-fetch the profile row so the client shell has data on first render
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, role, tier, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  // Shape the row into the store type (null-safe)
  const initialProfile: UserProfile | null = profileRow
    ? {
        id: profileRow.id,
        role: profileRow.role,
        tier: profileRow.tier,
        display_name: profileRow.display_name ?? null,
        avatar_url: profileRow.avatar_url ?? null,
      }
    : null

  return (
    <AppShell initialProfile={initialProfile}>
      {children}
    </AppShell>
  )
}
