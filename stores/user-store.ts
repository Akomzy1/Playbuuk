// stores/user-store.ts
// Global user profile store — initialised server-side (SSR) via AppShell and
// kept in sync with Supabase auth events client-side.
//
// Usage:
//   const { profile, loading } = useUserStore()
//   const { updateProfile, signOut } = useUserStore()

import { create } from 'zustand'
import type { Role, Tier } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  role: Role
  tier: Tier
  display_name: string | null
  avatar_url: string | null
}

interface UserStore {
  /** The current user's profile row — null when not authenticated or loading */
  profile: UserProfile | null
  /** True while the initial hydration is in flight */
  loading: boolean

  /** Set profile directly — used by AppShell to inject the SSR-fetched profile */
  setProfile: (profile: UserProfile | null) => void

  /**
   * Fetch the profile from Supabase. Call this when you need a fresh read
   * without SSR (e.g. after OAuth login where the server page wasn't reloaded).
   */
  hydrate: () => Promise<void>

  /**
   * Update display_name and/or avatar_url in both Supabase and local state.
   * Returns { error: string | null }.
   */
  updateProfile: (updates: {
    display_name?: string
    avatar_url?: string | null
  }) => Promise<{ error: string | null }>

  /** Sign out of Supabase and clear local profile */
  signOut: () => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  loading: false,

  setProfile: (profile) => set({ profile }),

  hydrate: async () => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        set({ profile: null, loading: false })
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, role, tier, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      set({ profile: (data as UserProfile | null) ?? null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get()
    if (!profile) return { error: 'Not authenticated' }

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    if (error) return { error: error.message }

    // Optimistic update — keep UI in sync immediately
    set({ profile: { ...profile, ...updates } })
    return { error: null }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))
