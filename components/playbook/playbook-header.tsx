'use client'

// components/playbook/playbook-header.tsx
// Premium playbook viewer header — trading terminal aesthetic.
//
// Layout:
//   - Back nav + AI draft warning
//   - Hero card: avatar (72px, glow ring), identity, stats row, follow button
//   - Divider
//   - Strategy name (3xl), version badge, summary
//   - Metadata chips: timeframes (info), session (cyan), pairs (purple)
//   - Last updated

import Link from 'next/link'
import { ArrowLeft, Clock, Globe, Users, Star, CheckCircle2, Bot } from 'lucide-react'
import { FollowButton } from '@/components/marketplace/follow-button'
import type { MentorRow, PlaybookRow } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaybookHeaderProps {
  mentor: Pick<
    MentorRow,
    | 'id' | 'display_name' | 'handle' | 'avatar_emoji' | 'bio'
    | 'verified' | 'follower_count' | 'rating' | 'style' | 'markets'
  >
  playbook: Pick<
    PlaybookRow,
    | 'strategy_name' | 'summary' | 'timeframes' | 'preferred_pairs'
    | 'session_preference' | 'is_verified' | 'is_ai_draft' | 'version'
    | 'published_at' | 'updated_at'
  >
  initialFollowing: boolean
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── PlaybookHeader ───────────────────────────────────────────────────────────

export function PlaybookHeader({ mentor, playbook, initialFollowing }: PlaybookHeaderProps) {
  const timeframes = Array.isArray(playbook.timeframes) ? (playbook.timeframes as string[]) : []
  const pairs      = Array.isArray(playbook.preferred_pairs) ? (playbook.preferred_pairs as string[]) : []
  const markets    = Array.isArray(mentor.markets) ? (mentor.markets as string[]) : []

  const updatedAt = playbook.updated_at
    ? new Date(playbook.updated_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  return (
    <header className="flex flex-col gap-3">
      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-text transition-colors w-fit"
        aria-label="Back to marketplace"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Marketplace
      </Link>

      {/* ── AI draft warning ──────────────────────────────────────────────── */}
      {playbook.is_ai_draft && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          role="alert"
          style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.22)',
          }}
        >
          <Bot size={14} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--gold)' }}>
            <span className="font-semibold">AI-Extracted Draft — Pending Mentor Review.</span>{' '}
            Generated from publicly available information about {mentor.display_name}&apos;s strategy.
            Rules are approximate until the mentor verifies their own playbook.
          </p>
        </div>
      )}

      {/* ── Main hero card ────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderTop: mentor.verified
            ? '2px solid rgba(0,229,176,0.4)'
            : '2px solid rgba(251,191,36,0.35)',
        }}
      >
        {/* Ambient glow blob */}
        <div
          className="pointer-events-none absolute -top-16 -left-12 w-96 h-60 rounded-full blur-3xl opacity-[0.07]"
          style={{ background: mentor.verified ? 'var(--accent)' : 'var(--gold)' }}
          aria-hidden="true"
        />

        <div className="relative p-5 md:p-6">
          {/* ── Mentor identity row ─────────────────────────────────────── */}
          <div className="flex items-start gap-4 flex-wrap">

            {/* Avatar with glow ring */}
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                style={{
                  background: mentor.verified
                    ? 'rgba(0,229,176,0.22)'
                    : 'rgba(251,191,36,0.18)',
                  transform: 'scale(1.4)',
                }}
                aria-hidden="true"
              />
              <div
                className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-[2.1rem]"
                style={{
                  background: mentor.verified
                    ? 'rgba(0,229,176,0.08)'
                    : 'rgba(251,191,36,0.07)',
                  border: mentor.verified
                    ? '1px solid rgba(0,229,176,0.25)'
                    : '1px solid rgba(251,191,36,0.22)',
                  boxShadow: mentor.verified
                    ? '0 0 0 4px rgba(0,229,176,0.05), 0 8px 32px rgba(0,0,0,0.35)'
                    : '0 0 0 4px rgba(251,191,36,0.04), 0 8px 32px rgba(0,0,0,0.35)',
                }}
                aria-hidden="true"
              >
                {mentor.avatar_emoji ?? '👤'}
              </div>
            </div>

            {/* Name + handle + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1
                  className="text-xl font-bold text-text"
                  style={{ letterSpacing: '-0.025em' }}
                >
                  {mentor.display_name}
                </h1>
                {mentor.verified ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono"
                    style={{
                      background: 'rgba(0,229,176,0.1)',
                      border: '1px solid rgba(0,229,176,0.3)',
                      color: 'var(--accent)',
                    }}
                    title="Mentor has reviewed and approved this playbook"
                  >
                    <CheckCircle2 size={11} aria-hidden="true" />
                    Verified
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{
                      background: 'rgba(251,191,36,0.07)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      color: 'var(--gold)',
                    }}
                  >
                    <Bot size={10} aria-hidden="true" />
                    Draft
                  </span>
                )}
              </div>

              <p className="text-sm text-dim">@{mentor.handle}</p>

              {mentor.style && (
                <span
                  className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium capitalize"
                  style={{
                    background: 'rgba(167,139,250,0.08)',
                    border: '1px solid rgba(167,139,250,0.2)',
                    color: 'var(--purple)',
                  }}
                >
                  {mentor.style}
                </span>
              )}
            </div>

            {/* Follow button */}
            <div className="flex-shrink-0">
              <FollowButton
                mentorId={mentor.id}
                initialFollowing={initialFollowing}
                initialCount={mentor.follower_count}
                size="md"
                showCount
              />
            </div>
          </div>

          {/* ── Stats row ───────────────────────────────────────────────── */}
          <div
            className="flex items-center flex-wrap gap-4 mt-4 px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Followers */}
            <div className="flex items-center gap-1.5">
              <Users
                size={13}
                style={{ color: mentor.verified ? 'var(--accent)' : 'var(--dim)' }}
                aria-hidden="true"
              />
              <span className="text-sm font-bold font-mono tabular-nums text-text">
                {formatFollowers(mentor.follower_count)}
              </span>
              <span className="text-xs text-muted">followers</span>
            </div>

            {/* Rating */}
            {mentor.rating !== null && (
              <>
                <div className="w-px h-4" style={{ background: 'var(--border)' }} aria-hidden="true" />
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
                    {mentor.rating.toFixed(1)}
                  </span>
                </div>
              </>
            )}

            {/* Market tags */}
            {markets.length > 0 && (
              <>
                <div className="w-px h-4" style={{ background: 'var(--border)' }} aria-hidden="true" />
                <div className="flex gap-1.5 flex-wrap">
                  {markets.slice(0, 4).map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2 py-0.5 rounded-full font-mono font-medium capitalize"
                      style={{
                        background: 'rgba(34,211,238,0.06)',
                        border: '1px solid rgba(34,211,238,0.15)',
                        color: 'var(--cyan)',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div
            className="mt-5 mb-5"
            style={{ height: '1px', background: 'var(--border)' }}
            aria-hidden="true"
          />

          {/* ── Strategy name + summary ──────────────────────────────────── */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2
                className="text-2xl md:text-3xl font-bold text-text"
                style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
              >
                {playbook.strategy_name}
              </h2>
              {playbook.is_verified && (
                <span
                  className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md"
                  style={{
                    background: 'rgba(0,229,176,0.08)',
                    border: '1px solid rgba(0,229,176,0.2)',
                    color: 'var(--accent)',
                  }}
                >
                  Verified v{playbook.version}
                </span>
              )}
            </div>
            {playbook.summary && (
              <p className="text-sm text-dim leading-relaxed max-w-2xl">
                {playbook.summary}
              </p>
            )}
          </div>

          {/* ── Metadata chips ───────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {/* Timeframes */}
            {timeframes.map((tf) => (
              <span
                key={tf}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: 'rgba(77,142,255,0.08)',
                  border: '1px solid rgba(77,142,255,0.2)',
                  color: 'var(--info)',
                }}
              >
                <Clock size={10} aria-hidden="true" />
                {tf}
              </span>
            ))}

            {/* Session */}
            {playbook.session_preference && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.2)',
                  color: 'var(--cyan)',
                }}
              >
                <Globe size={10} aria-hidden="true" />
                {playbook.session_preference}
              </span>
            )}

            {/* Pairs */}
            {pairs.slice(0, 8).map((pair) => (
              <span
                key={pair}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: 'rgba(167,139,250,0.07)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  color: 'var(--purple)',
                }}
              >
                {pair}
              </span>
            ))}
            {pairs.length > 8 && (
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-mono"
                style={{ color: 'var(--muted)' }}
              >
                +{pairs.length - 8} more
              </span>
            )}
          </div>

          {/* Updated at */}
          {updatedAt && (
            <p className="text-xs text-muted font-mono mt-3">
              Updated {updatedAt}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
