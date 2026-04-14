'use client'

// components/marketplace/mentor-card.tsx
// Premium portrait mentor card.
//
// Layout (top → bottom):
//   - AI Draft warning stripe (draft mentors only)
//   - Large centred emoji avatar with ambient glow ring
//   - Verified badge OR "AI Draft" chip centred below avatar
//   - Display name + @handle + style tag — centred
//   - Prominent follower count + rating row
//   - Divider
//   - Strategy chip, bio (2-line clamp), market/style tags
//   - Footer: Follow button full-width
//
// Hover: accent border glow (var(--accent-glow)), translateY(-2px) scale(1.01),
//        gradient top-border reveal via ::before (handled by .card class globally).

import Link from 'next/link'
import { Star, Users, ArrowRight, Bot } from 'lucide-react'
import { FollowButton } from './follow-button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MentorCardData {
  id: string
  display_name: string
  handle: string
  bio: string | null
  avatar_emoji: string | null
  markets: string[]
  style: string | null
  follower_count: number
  external_followers: string | null
  rating: number | null
  review_count: number
  verified: boolean
  onboarding_status: string
  is_ai_draft: boolean
  playbook_id: string | null
  strategy_name: string | null
  /** Pre-resolved follow state from SSR */
  initialFollowing: boolean
}

interface MentorCardProps {
  mentor: MentorCardData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFollowers(n: number, external: string | null): string {
  const onPlatform = n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : n > 0 ? n.toLocaleString() : null

  const parts = [onPlatform, external].filter(Boolean)
  return parts.join(' · ') || '0'
}

// ─── MentorCard ───────────────────────────────────────────────────────────────

export function MentorCard({ mentor }: MentorCardProps) {
  const {
    id, display_name, handle, bio, avatar_emoji,
    markets, style, follower_count, external_followers,
    rating, review_count, verified, is_ai_draft,
    strategy_name, initialFollowing,
  } = mentor

  const followerStr = formatFollowers(follower_count, external_followers)

  return (
    <Link href={`/mentor/${id}`} className="group block h-full" tabIndex={-1}>
      <article
        className="relative flex flex-col h-full overflow-hidden rounded-2xl transition-all duration-200"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          // top-line gradient reveal on hover
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-2px) scale(1.01)'
          el.style.boxShadow = verified
            ? '0 0 0 1px rgba(0,229,176,0.3), 0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(0,229,176,0.1)'
            : '0 0 0 1px rgba(251,191,36,0.2), 0 8px 32px rgba(0,0,0,0.45)'
          el.style.borderColor = verified
            ? 'rgba(0,229,176,0.3)'
            : 'rgba(251,191,36,0.25)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.transform = ''
          el.style.boxShadow = ''
          el.style.borderColor = 'var(--border)'
        }}
        aria-label={`${display_name} — ${strategy_name ?? 'Trading mentor'}`}
      >
        {/* ── Gradient top accent line (verified = green, draft = gold) ──────── */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200"
          style={{
            background: verified
              ? 'linear-gradient(90deg, transparent, rgba(0,229,176,0.6), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)',
            opacity: 0.6,
          }}
          aria-hidden="true"
        />

        {/* ── AI Draft stripe ───────────────────────────────────────────────── */}
        {is_ai_draft && (
          <div
            className="flex items-center justify-center gap-1.5 py-1.5 text-2xs font-semibold font-mono tracking-wide"
            style={{
              background: 'rgba(251,191,36,0.07)',
              borderBottom: '1px solid rgba(251,191,36,0.15)',
              color: 'var(--gold)',
            }}
          >
            <Bot size={9} aria-hidden="true" />
            AI-Extracted Draft — Pending Review
          </div>
        )}

        {/* ── Card body ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 p-5">

          {/* ── Avatar + badges (centred) ──────────────────────────────────── */}
          <div className="flex flex-col items-center gap-2 mb-4">
            {/* Avatar with ambient glow */}
            <div className="relative">
              {/* Glow blob behind avatar */}
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: verified
                    ? 'rgba(0,229,176,0.25)'
                    : 'rgba(251,191,36,0.2)',
                  transform: 'scale(1.5)',
                }}
                aria-hidden="true"
              />
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: verified
                    ? 'rgba(0,229,176,0.08)'
                    : 'rgba(251,191,36,0.07)',
                  border: verified
                    ? '1px solid rgba(0,229,176,0.2)'
                    : '1px solid rgba(251,191,36,0.18)',
                  boxShadow: verified
                    ? '0 0 0 4px rgba(0,229,176,0.05)'
                    : '0 0 0 4px rgba(251,191,36,0.04)',
                }}
                aria-hidden="true"
              >
                {avatar_emoji ?? '👤'}
              </div>
            </div>

            {/* Verified badge OR AI Draft label */}
            {verified ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold font-mono"
                style={{
                  background: 'rgba(0,229,176,0.1)',
                  border: '1px solid rgba(0,229,176,0.3)',
                  color: 'var(--accent)',
                }}
              >
                ✓ Verified
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono"
                style={{
                  background: 'rgba(107,127,163,0.08)',
                  border: '1px solid rgba(107,127,163,0.2)',
                  color: 'var(--muted)',
                }}
              >
                Draft
              </span>
            )}
          </div>

          {/* ── Name + handle + style (centred) ───────────────────────────── */}
          <div className="text-center mb-3">
            <h3
              className="text-base font-bold text-text leading-tight mb-0.5"
              style={{ letterSpacing: '-0.02em' }}
            >
              {display_name}
            </h3>
            <p className="text-xs text-muted">@{handle}</p>
            {style && (
              <span
                className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-2xs font-mono font-medium capitalize"
                style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  color: 'var(--purple)',
                }}
              >
                {style}
              </span>
            )}
          </div>

          {/* ── Prominent follower + rating row ───────────────────────────── */}
          <div
            className="flex items-center justify-center gap-4 py-2.5 px-3 rounded-xl mb-4"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Followers */}
            <div className="flex items-center gap-1.5">
              <Users
                size={13}
                style={{ color: verified ? 'var(--accent)' : 'var(--muted)' }}
                aria-hidden="true"
              />
              <span
                className="text-sm font-bold font-mono tabular-nums"
                style={{ color: verified ? 'var(--text)' : 'var(--dim)' }}
                aria-label={`${followerStr} followers`}
              >
                {followerStr}
              </span>
            </div>

            {/* Divider */}
            {rating !== null && (
              <div
                className="w-px h-4 self-center"
                style={{ background: 'var(--border)' }}
                aria-hidden="true"
              />
            )}

            {/* Rating */}
            {rating !== null && (
              <div className="flex items-center gap-1">
                <Star
                  size={12}
                  style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm font-bold font-mono tabular-nums"
                  style={{ color: 'var(--gold)' }}
                >
                  {rating.toFixed(1)}
                </span>
                {review_count > 0 && (
                  <span className="text-2xs text-muted">({review_count})</span>
                )}
              </div>
            )}
          </div>

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <div className="mb-3" style={{ height: '1px', background: 'var(--border)' }} />

          {/* ── Strategy chip ─────────────────────────────────────────────── */}
          {strategy_name && (
            <p
              className="text-xs font-semibold font-mono px-2.5 py-1 rounded-lg mb-2 truncate self-start max-w-full"
              style={{
                background: 'rgba(77,142,255,0.07)',
                border: '1px solid rgba(77,142,255,0.18)',
                color: 'var(--info)',
              }}
            >
              {strategy_name}
            </p>
          )}

          {/* ── Bio ───────────────────────────────────────────────────────── */}
          {bio && (
            <p
              className="text-xs text-dim leading-relaxed mb-3 flex-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bio}
            </p>
          )}

          {/* ── Market tags ───────────────────────────────────────────────── */}
          {markets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto mb-3">
              {markets.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="text-2xs px-2 py-0.5 rounded-full font-mono font-medium capitalize"
                  style={{
                    background: 'rgba(34,211,238,0.06)',
                    border: '1px solid rgba(34,211,238,0.15)',
                    color: 'var(--cyan)',
                  }}
                >
                  {m}
                </span>
              ))}
              {markets.length > 3 && (
                <span
                  className="text-2xs px-2 py-0.5 rounded-full font-mono"
                  style={{ color: 'var(--muted)' }}
                >
                  +{markets.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Follow button footer ──────────────────────────────────────────── */}
        <div
          className="px-4 pb-4 pt-2"
          style={{ borderTop: '1px solid var(--border)' }}
          onClick={(e) => e.preventDefault()}
        >
          <FollowButton
            mentorId={id}
            initialFollowing={initialFollowing}
            initialCount={follower_count}
            size="md"
            showCount={false}
          />

          {/* View playbook link */}
          <div
            className="flex items-center justify-center gap-1 mt-2 text-2xs text-muted group-hover:text-dim transition-colors duration-150"
          >
            <span>View playbook</span>
            <ArrowRight
              size={10}
              className="transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </div>
      </article>
    </Link>
  )
}
