'use client'

// components/marketplace/follow-button.tsx
// Toggle follow/unfollow button with:
//   - Optimistic UI — updates immediately, reverts on API error
//   - Satisfying scale + colour animation on click
//   - Optional follower count display (locale-formatted)
//   - Two size variants: 'sm' (card use) and 'md' (playbook page)
//   - Works standalone or alongside a follower count badge

import { useState, useCallback } from 'react'
import { Heart, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowButtonProps {
  mentorId: string
  /** Initial follow state — passed from SSR (isFollowing helper) */
  initialFollowing: boolean
  /** Initial count — from mentor.follower_count, kept in sync with API response */
  initialCount: number
  /** Size variant — 'sm' for cards, 'md' for playbook header */
  size?: 'sm' | 'md'
  /** Show the formatted follower count alongside the button */
  showCount?: boolean
  /** Called after a successful follow/unfollow with the new state */
  onToggle?: (following: boolean, count: number) => void
}

// ─── Number formatting ────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── FollowButton ─────────────────────────────────────────────────────────────

export function FollowButton({
  mentorId,
  initialFollowing,
  initialCount,
  size = 'sm',
  showCount = false,
  onToggle,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  // tracks if the user just clicked (drives the burst animation)
  const [justToggled, setJustToggled] = useState(false)

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault() // prevent card link navigation when used inside <Link>
      e.stopPropagation()

      if (loading) return

      // Optimistic update
      const newFollowing = !following
      const optimisticCount = newFollowing ? count + 1 : Math.max(0, count - 1)
      setFollowing(newFollowing)
      setCount(optimisticCount)
      setLoading(true)
      setJustToggled(true)
      setTimeout(() => setJustToggled(false), 600)

      try {
        const res = await fetch(`/api/mentors/${mentorId}/follow`, {
          method: newFollowing ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          // Revert on error
          setFollowing(following)
          setCount(count)
          return
        }

        const data = (await res.json()) as { following: boolean; follower_count: number }
        // Sync to the server's authoritative values (accounts for race conditions)
        setFollowing(data.following)
        setCount(data.follower_count)
        onToggle?.(data.following, data.follower_count)
      } catch {
        // Revert on network error
        setFollowing(following)
        setCount(count)
      } finally {
        setLoading(false)
      }
    },
    [following, count, loading, mentorId, onToggle],
  )

  // ── Style variants ──────────────────────────────────────────────────────────
  const isSm = size === 'sm'

  const baseBtn = `
    relative inline-flex items-center gap-1.5
    font-semibold rounded-xl
    transition-all duration-200
    outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
    select-none cursor-pointer
    ${isSm ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2.5'}
    ${loading ? 'pointer-events-none' : ''}
    ${justToggled ? 'scale-95' : 'scale-100'}
  `.trim()

  // Following: filled accent with subtle glow; Not following: outline ghost
  const variantStyle = following
    ? {
        background: 'rgba(0,229,176,0.15)',
        border: '1px solid rgba(0,229,176,0.4)',
        color: 'var(--accent)',
        boxShadow: justToggled ? '0 0 16px rgba(0,229,176,0.35)' : 'none',
      }
    : {
        background: 'transparent',
        border: '1px solid rgba(107,127,163,0.35)',
        color: 'var(--dim)',
        boxShadow: 'none',
      }

  const heartFill = following ? 'var(--accent)' : 'none'
  const heartStroke = following ? 'var(--accent)' : 'var(--dim)'

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={following}
        aria-label={following ? 'Unfollow mentor' : 'Follow mentor'}
        className={baseBtn}
        style={variantStyle}
        onMouseEnter={(e) => {
          if (!following) {
            e.currentTarget.style.borderColor = 'rgba(0,229,176,0.35)'
            e.currentTarget.style.color = 'var(--text)'
          } else {
            e.currentTarget.style.background = 'rgba(0,229,176,0.22)'
          }
        }}
        onMouseLeave={(e) => {
          if (!following) {
            e.currentTarget.style.borderColor = 'rgba(107,127,163,0.35)'
            e.currentTarget.style.color = 'var(--dim)'
          } else {
            e.currentTarget.style.background = 'rgba(0,229,176,0.15)'
          }
        }}
      >
        {loading ? (
          <Loader2
            size={isSm ? 11 : 13}
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Heart
            size={isSm ? 11 : 13}
            aria-hidden="true"
            style={{
              fill: heartFill,
              stroke: heartStroke,
              transition: 'fill 200ms ease, stroke 200ms ease',
              // pop scale on the heart icon when just toggled to following
              transform: justToggled && following ? 'scale(1.3)' : 'scale(1)',
              transitionProperty: 'fill, stroke, transform',
              transitionDuration: '200ms',
            }}
          />
        )}
        <span
          style={{
            // subtle width transition so "Follow" ↔ "Following" doesn't jump layout
            transition: 'opacity 150ms ease',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {following ? 'Following' : 'Follow'}
        </span>
      </button>

      {/* Follower count badge */}
      {showCount && (
        <span
          className="font-mono tabular-nums"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${count} followers`}
          style={{
            fontSize: isSm ? '0.6875rem' : '0.8125rem',
            color: 'var(--dim)',
            transition: 'color 200ms ease',
          }}
        >
          {formatCount(count)}
        </span>
      )}
    </div>
  )
}
