// app/(marketing)/preview/[mentorHandle]/page.tsx
// Personalised mentor outreach page — sent in DMs during partnership outreach.
// No auth required. Shows the mentor's AI-drafted playbook + follower count
// with a "Claim Your Profile" CTA linking to /signup.
//
// URL structure: /preview/alexg  (mentorHandle = handle field on Mentor)
// 404 if mentor not found or withdrawn.
//
// Design goal: 15-second impact on a phone screen.
//   1. Big number: X traders following you
//   2. Your playbook is live right now
//   3. Revenue waiting in escrow
//   4. One button: Claim it

import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import Link              from 'next/link'
import { db }            from '@/lib/db'
import {
  ArrowRight, CheckCircle2, Users, Star, Lock,
  TrendingUp, Shield, Zap, AlertCircle, Bell,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { mentorHandle: string }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const mentor = await getMentor(params.mentorHandle)
  if (!mentor) {
    return { title: 'Mentor Not Found — Playbuuk' }
  }

  return {
    title: `${mentor.display_name} — Your Playbuuk Profile`,
    description: `${mentor.follower_count} traders are already following ${mentor.display_name} on Playbuuk. Claim your profile to start earning from your followers.`,
    robots: { index: false, follow: false },  // outreach page — don't index
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getMentor(handle: string) {
  return db.mentor.findFirst({
    where: {
      handle: handle.toLowerCase(),
      onboarding_status: { not: 'withdrawn' },
    },
    select: {
      id:                true,
      display_name:      true,
      handle:            true,
      bio:               true,
      avatar_emoji:      true,
      markets:           true,
      style:             true,
      follower_count:    true,
      external_followers: true,
      verified:          true,
      onboarding_status: true,
      created_at:        true,
      playbooks: {
        where:   { is_ai_draft: true },
        orderBy: { updated_at: 'desc' },
        take:    1,
        select: {
          id:            true,
          strategy_name: true,
          summary:       true,
          golden_rules:  true,
          entry_rules:   true,
          checklist:     true,
          is_ai_draft:   true,
          is_verified:   true,
          updated_at:    true,
        },
      },
      escrow: {
        select: {
          total_accrued: true,
          released:      true,
        },
      },
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateMonthlyRevenue(followerCount: number): number {
  // Rough estimate: 15% Pro conversion at $19.99 × 40% mentor pool ÷ platform-wide points
  // We show a conservative figure — better to under-promise
  const proFollowers = Math.max(1, Math.round(followerCount * 0.12))
  return Math.round(proFollowers * 19.99 * 0.15)
}

function getStatusLabel(status: string): { label: string; color: string; bg: string; border: string } {
  switch (status) {
    case 'verified':
      return { label: 'Verified Mentor', color: 'var(--accent)', bg: 'rgba(0,229,176,0.08)', border: 'rgba(0,229,176,0.2)' }
    case 'under_review':
      return { label: 'Under Review', color: 'var(--gold)', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' }
    case 'draft_ready':
    case 'invitation_sent':
      return { label: 'AI Draft Ready', color: 'var(--info)', bg: 'rgba(77,142,255,0.08)', border: 'rgba(77,142,255,0.2)' }
    default:
      return { label: 'Profile Active', color: 'var(--dim)', bg: 'rgba(107,127,163,0.08)', border: 'rgba(107,127,163,0.2)' }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  color = 'var(--accent)',
}: {
  value: string | number
  label: string
  color?: string
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl flex-1"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="text-2xl sm:text-3xl font-bold font-mono leading-none"
        style={{ color, letterSpacing: '-0.03em' }}
      >
        {value}
      </span>
      <span className="text-2xs font-mono text-muted text-center leading-tight">{label}</span>
    </div>
  )
}

function BlurredRule({ text }: { text: string }) {
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl relative overflow-hidden"
      style={{ background: 'rgba(107,127,163,0.04)', border: '1px solid var(--border)' }}
    >
      <Lock size={11} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <p
        className="text-xs text-dim leading-relaxed flex-1 select-none"
        style={{ filter: 'blur(4px)', userSelect: 'none' }}
        aria-hidden="true"
      >
        {text}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MentorPreviewPage({ params }: PageProps) {
  const mentor = await getMentor(params.mentorHandle)
  if (!mentor) notFound()

  const playbook  = mentor.playbooks[0] ?? null
  const status    = getStatusLabel(mentor.onboarding_status)
  const markets   = (mentor.markets as string[]) ?? []
  const escrow    = mentor.escrow
  const estMonthly = estimateMonthlyRevenue(mentor.follower_count)

  // Playbook content helpers
  const goldenRules = (playbook?.golden_rules as string[]) ?? []
  const entryRules  = (playbook?.entry_rules  as string[]) ?? []
  const checklist   = (playbook?.checklist    as { id: string; item: string }[]) ?? []

  // Show first 2 rules visible, rest blurred
  const visibleGolden  = goldenRules.slice(0, 2)
  const blurredGolden  = goldenRules.slice(2, 5)
  const visibleEntry   = entryRules.slice(0, 2)
  const blurredEntry   = entryRules.slice(2, 4)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Outreach banner ──────────────────────────────────────────────── */}
      <div
        className="sticky top-14 z-20 px-4 sm:px-6 py-2.5 flex items-center gap-2"
        style={{
          background: 'rgba(251,191,36,0.06)',
          borderBottom: '1px solid rgba(251,191,36,0.18)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <AlertCircle size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} aria-hidden="true" />
        <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>
          <span className="font-semibold">Hey {mentor.display_name}</span>
          {' '}— this page was created for you. Your strategy is already live on Playbuuk.
        </p>
      </div>

      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto">

        {/* ── Mentor hero card ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 sm:p-8 mb-5 relative overflow-hidden text-center"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 65%)',
            }}
            aria-hidden="true"
          />

          {/* Avatar */}
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '2px solid rgba(251,191,36,0.2)',
              boxShadow: '0 0 30px rgba(251,191,36,0.12)',
            }}
          >
            {mentor.avatar_emoji ?? '🎯'}
          </div>

          {/* Name + handle */}
          <h1
            className="relative text-2xl sm:text-3xl font-bold text-text mb-1"
            style={{ letterSpacing: '-0.03em' }}
          >
            {mentor.display_name}
          </h1>
          <p className="relative text-sm font-mono text-muted mb-3">@{mentor.handle}</p>

          {/* Status badge */}
          <div className="relative flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold font-mono px-3 py-1.5 rounded-full"
              style={{
                background: status.bg,
                border: `1px solid ${status.border}`,
                color: status.color,
              }}
            >
              {mentor.verified
                ? <CheckCircle2 size={11} aria-hidden="true" />
                : <Zap size={11} aria-hidden="true" />
              }
              {status.label}
            </span>
          </div>

          {/* Markets */}
          {markets.length > 0 && (
            <div className="relative flex flex-wrap justify-center gap-1.5 mb-5">
              {markets.map(m => (
                <span
                  key={m}
                  className="text-2xs font-mono px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'rgba(77,142,255,0.08)',
                    border: '1px solid rgba(77,142,255,0.2)',
                    color: 'var(--info)',
                  }}
                >
                  {m}
                </span>
              ))}
              {mentor.style && (
                <span
                  className="text-2xs font-mono px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'rgba(0,229,176,0.07)',
                    border: '1px solid rgba(0,229,176,0.18)',
                    color: 'var(--accent)',
                  }}
                >
                  {mentor.style}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {mentor.bio && (
            <p className="relative text-sm text-dim leading-relaxed max-w-sm mx-auto">
              {mentor.bio}
            </p>
          )}
        </div>

        {/* ── Key stats ────────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-5">
          <StatPill
            value={mentor.follower_count.toLocaleString()}
            label="Traders following you"
            color="var(--accent)"
          />
          {escrow && !escrow.released && Number(escrow.total_accrued) > 0 ? (
            <StatPill
              value={`$${Number(escrow.total_accrued).toFixed(0)}`}
              label="Accrued in escrow"
              color="var(--gold)"
            />
          ) : (
            <StatPill
              value={`~$${estMonthly}`}
              label="Est. monthly revenue"
              color="var(--gold)"
            />
          )}
        </div>

        {/* ── Revenue teaser ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-4 mb-5 flex items-start gap-3"
          style={{
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.15)',
          }}
        >
          <TrendingUp size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-text mb-1">
              Your followers are already generating revenue.
            </p>
            <p className="text-xs text-dim leading-relaxed">
              Verified mentors earn a share of Pro subscription revenue — calculated from how
              actively their followers use the playbook (checklist opens, time in trade, executions).
              {escrow && !escrow.released && Number(escrow.total_accrued) > 0
                ? ` $${Number(escrow.total_accrued).toFixed(2)} is already accrued in escrow waiting for you.`
                : ` Every Pro follower who uses your playbook adds to your monthly payout.`
              }
            </p>
          </div>
        </div>

        {/* ── Playbook preview ─────────────────────────────────────────── */}
        {playbook ? (
          <div
            className="rounded-2xl overflow-hidden mb-5"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between gap-3"
              style={{
                background: 'rgba(77,142,255,0.06)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-2xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(77,142,255,0.1)',
                      border: '1px solid rgba(77,142,255,0.25)',
                      color: 'var(--info)',
                    }}
                  >
                    AI Draft
                  </span>
                  <span className="text-2xs text-muted font-mono">Pending your review</span>
                </div>
                <h2
                  className="text-base font-bold text-text"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {playbook.strategy_name ?? `${mentor.display_name}'s Playbook`}
                </h2>
              </div>
              <div
                className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{
                  background: 'rgba(107,127,163,0.08)',
                  border: '1px solid var(--border)',
                  color: 'var(--dim)',
                }}
              >
                {checklist.length} rules
              </div>
            </div>

            {/* Summary */}
            {playbook.summary && (
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
              >
                <p className="text-xs font-semibold text-dim font-mono uppercase tracking-wider mb-2">
                  Strategy Overview
                </p>
                <p className="text-sm text-dim leading-relaxed">
                  {String(playbook.summary).slice(0, 280)}
                  {String(playbook.summary).length > 280 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Golden rules preview */}
            {goldenRules.length > 0 && (
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Star size={12} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                  <p className="text-xs font-semibold font-mono" style={{ color: 'var(--gold)' }}>
                    Golden Rules
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {visibleGolden.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}
                    >
                      <Star size={10} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <p className="text-xs text-dim leading-relaxed">{String(rule)}</p>
                    </div>
                  ))}
                  {blurredGolden.map((rule, i) => (
                    <BlurredRule key={i} text={String(rule)} />
                  ))}
                  {goldenRules.length > 5 && (
                    <p className="text-2xs text-muted font-mono px-1">
                      +{goldenRules.length - 5} more golden rules…
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Entry rules preview */}
            {entryRules.length > 0 && (
              <div
                className="px-5 py-4"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                  <p className="text-xs font-semibold font-mono" style={{ color: 'var(--accent)' }}>
                    Entry Rules
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {visibleEntry.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.12)' }}
                    >
                      <CheckCircle2 size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <p className="text-xs text-dim leading-relaxed">{String(rule)}</p>
                    </div>
                  ))}
                  {blurredEntry.map((rule, i) => (
                    <BlurredRule key={i} text={String(rule)} />
                  ))}
                </div>

                {/* Unlock prompt */}
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(107,127,163,0.06)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Lock size={11} style={{ color: 'var(--muted)' }} aria-hidden="true" />
                  <p className="text-xs text-muted">
                    {checklist.length - 4 > 0
                      ? `${checklist.length} checklist items + full playbook unlocks when you claim your profile.`
                      : 'Full playbook unlocks when you claim your profile.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl px-5 py-5 mb-5 flex items-start gap-3"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Zap size={14} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <p className="text-sm text-dim leading-relaxed">
              Your AI-drafted playbook is being prepared. Claim your profile and our team will
              send it to you for review within 24 hours.
            </p>
          </div>
        )}

        {/* ── What you get ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-5 py-5 mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-bold text-text mb-3" style={{ letterSpacing: '-0.01em' }}>
            What you get when you claim your profile
          </p>
          <div className="flex flex-col gap-2.5">
            {[
              {
                Icon: CheckCircle2,
                color: 'var(--accent)',
                text: 'Review and edit your AI-drafted playbook — then verify it with one click',
              },
              {
                Icon: TrendingUp,
                color: 'var(--gold)',
                text: 'Monthly payouts from Pro followers who actively use your playbook',
              },
              {
                Icon: Users,
                color: 'var(--info)',
                text: `Dashboard showing ${mentor.follower_count.toLocaleString()} follower activity, engagement, and revenue`,
              },
              {
                Icon: Shield,
                color: 'var(--accent)',
                text: 'Verified mentor badge — builds trust and drives more followers',
              },
              {
                Icon: Bell,
                color: 'var(--cyan)',
                text: 'Followers get A+ setup alerts — they act on your strategy more, you earn more',
              },
            ].map(({ Icon, color, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <Icon size={12} style={{ color, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <p className="text-xs text-dim leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Primary CTA ───────────────────────────────────────────────── */}
        <div className="text-center">
          <Link
            href={`/signup?ref=preview&handle=${mentor.handle}`}
            className="inline-flex items-center gap-2 font-bold text-base px-8 py-4 rounded-2xl transition-all hover:brightness-110 active:scale-95 w-full sm:w-auto justify-center"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              boxShadow: '0 0 32px rgba(0,229,176,0.35)',
            }}
          >
            Claim your profile
            <ArrowRight size={18} aria-hidden="true" />
          </Link>

          <p className="text-xs text-muted font-mono mt-3">
            Free to join · Takes 2 minutes · No card needed
          </p>

          <div className="flex items-center justify-center gap-4 mt-5">
            <Link
              href="/demo"
              className="text-xs font-medium transition-colors hover:text-text"
              style={{ color: 'var(--dim)' }}
            >
              See live demo →
            </Link>
            <span style={{ color: 'var(--border)' }}>·</span>
            <Link
              href="/home"
              className="text-xs font-medium transition-colors hover:text-text"
              style={{ color: 'var(--dim)' }}
            >
              How it works →
            </Link>
          </div>
        </div>

        <p
          className="text-center text-2xs font-mono mt-8"
          style={{ color: 'var(--muted)', opacity: 0.4 }}
        >
          Not financial advice. Trading carries substantial risk.
          Playbuuk does not guarantee any revenue or trading results.
        </p>
      </div>
    </div>
  )
}
