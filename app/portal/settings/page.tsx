// app/portal/settings/page.tsx
// Mentor profile settings — display name, bio, avatar emoji, contact info,
// markets, style, signature. Also shows Stripe Connect status.
// Note: preferred_pairs and session_preference live on the Playbook model
// and are editable in the Playbook Editor (/portal/playbook).

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { db }            from '@/lib/db'
import { PortalSettingsShell } from './settings-shell'

export const metadata: Metadata = {
  title:   'Profile Settings — Mentor Portal | Playbuuk',
  description: 'Edit your mentor profile, bio, and Stripe Connect payout settings.',
  robots:  { index: false },
}

export default async function PortalSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const mentor = await db.mentor.findUnique({
    where:  { user_id: user.id },
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
      stripe_connect_id: true,
      onboarding_status: true,
    },
  })

  if (!mentor) redirect('/portal')

  return (
    <PortalSettingsShell
      mentor={{
        id:                mentor.id,
        display_name:      mentor.display_name,
        handle:            mentor.handle,
        bio:               mentor.bio ?? '',
        avatar_emoji:      mentor.avatar_emoji ?? '🎯',
        markets:           Array.isArray(mentor.markets) ? mentor.markets as string[] : [],
        style:             mentor.style ?? '',
        signature:         mentor.signature ?? '',
        contact_info:      mentor.contact_info ?? '',
        stripe_connect_id: mentor.stripe_connect_id,
        onboarding_status: mentor.onboarding_status,
      }}
    />
  )
}
