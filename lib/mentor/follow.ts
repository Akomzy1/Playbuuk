// lib/mentor/follow.ts
// Server-side helpers for the follow system.
// All functions use the server Supabase client (RLS-enforced).
// Import only in Server Components, Server Actions, and API routes.

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowedMentor {
  id: string
  display_name: string
  handle: string
  avatar_emoji: string | null
  bio: string | null
  verified: boolean
  follower_count: number
  rating: number | null
  style: string | null
  followed_at: string
}

// ─── getFollowedMentors ───────────────────────────────────────────────────────

/**
 * Returns the list of mentors followed by the given user, sorted by follow date
 * (most recently followed first).
 */
export async function getFollowedMentors(userId: string): Promise<FollowedMentor[]> {
  const supabase = createClient()

  // Step 1: get follow rows sorted by most-recently-followed
  const { data: follows, error: followErr } = await supabase
    .from('mentor_follows')
    .select('mentor_id, followed_at')
    .eq('user_id', userId)
    .order('followed_at', { ascending: false })

  if (followErr) {
    console.error('[follow] getFollowedMentors follow error:', followErr.message)
    return []
  }

  if (!follows || follows.length === 0) return []

  const mentorIds = follows.map((f) => f.mentor_id)
  const followedAtMap = new Map(follows.map((f) => [f.mentor_id, f.followed_at]))

  // Step 2: fetch mentor rows by ID
  const { data: mentors, error: mentorErr } = await supabase
    .from('mentors')
    .select('id, display_name, handle, avatar_emoji, bio, verified, follower_count, rating, style')
    .in('id', mentorIds)

  if (mentorErr) {
    console.error('[follow] getFollowedMentors mentor error:', mentorErr.message)
    return []
  }

  // Re-sort to original follow order
  return (mentors ?? [])
    .map((m) => ({
      ...m,
      followed_at: followedAtMap.get(m.id) ?? '',
    }))
    .sort((a, b) => b.followed_at.localeCompare(a.followed_at))
}

// ─── isFollowing ──────────────────────────────────────────────────────────────

/**
 * Returns true if userId is following mentorId.
 * Designed for use in Server Components that need to render the follow button
 * in the correct state on first load.
 */
export async function isFollowing(userId: string, mentorId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('mentor_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('mentor_id', mentorId)
    .maybeSingle()

  if (error) {
    console.error('[follow] isFollowing error:', error.message)
    return false
  }

  return data !== null
}

// ─── getFollowerCount ─────────────────────────────────────────────────────────

/**
 * Returns the current follower count for a mentor.
 * The authoritative count lives on mentors.follower_count (maintained by DB trigger).
 * Use this when you need a fresh read without fetching the full mentor row.
 */
export async function getFollowerCount(mentorId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('mentors')
    .select('follower_count')
    .eq('id', mentorId)
    .single()

  if (error) {
    console.error('[follow] getFollowerCount error:', error.message)
    return 0
  }

  return data.follower_count
}

// ─── getFollowedMentorIds ─────────────────────────────────────────────────────

/**
 * Returns just the mentor IDs followed by a user.
 * Lightweight version for set-membership checks (e.g. initialising FollowButton state
 * for a grid of mentor cards without fetching full mentor data).
 */
export async function getFollowedMentorIds(userId: string): Promise<Set<string>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('mentor_follows')
    .select('mentor_id')
    .eq('user_id', userId)

  if (error) {
    console.error('[follow] getFollowedMentorIds error:', error.message)
    return new Set()
  }

  return new Set((data ?? []).map((row) => row.mentor_id))
}
