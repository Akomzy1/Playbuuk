// app/admin/page.tsx
// Admin dashboard — platform overview.
//
// Server component: all data fetched in parallel at request time.
//
// Cards:
//   · Total mentors (verified vs draft counts)
//   · Total followers (mentor_follows)
//   · Active Pro subscriptions + estimated MRR
//   · Escrow total across all unverified mentors
//
// Recent activity:
//   · Latest 10 follows
//   · Latest 5 trades
//   · Latest 5 mentor requests

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { db }             from '@/lib/db'
import {
  Users, TrendingUp, DollarSign, Lock,
  BookOpen, ChevronRight, Activity,
} from 'lucide-react'

export const metadata: Metadata = {
  title:   'Admin Dashboard — Playbuuk',
  robots:  { index: false, follow: false },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentFollow   = { mentor_name: string; followed_at: Date }
type RecentTrade    = { pair: string; direction: string; setup_grade: string | null; created_at: Date }
type RecentRequest  = { mentor_name: string; vote_count: number; status: string; created_at: Date }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(date: Date): string {
  const diff  = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const STATUS_COLORS: Record<string, string> = {
  admin_added:    '#6b7fa3',
  draft_ready:    '#4d8eff',
  invitation_sent:'#fbbf24',
  under_review:   '#fb923c',
  verified:       '#00e5b0',
  withdrawn:      '#ff4d6a',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  // ── Parallel data fetching ─────────────────────────────────────────────────
  type RawCount = { count: bigint }
  type RawEscrow = { total: bigint }
  type RawFollowRow = { display_name: string; followed_at: Date }
  type RawTradeRow  = { pair: string; direction: string; setup_grade: string | null; created_at: Date }
  type RawRequestRow = { mentor_name: string; vote_count: number; status: string; created_at: Date }
  type RawMRR = { total: bigint }

  const [
    verifiedCount, draftCount, totalFollowers,
    proSubCount, directSubCount,
    escrowTotal,
    recentFollows, recentTrades, recentRequests,
  ] = await Promise.all([
    // Verified mentors
    db.$queryRaw<RawCount[]>`SELECT COUNT(*)::bigint AS count FROM mentors WHERE verified = true`,
    // Draft + unverified
    db.$queryRaw<RawCount[]>`SELECT COUNT(*)::bigint AS count FROM mentors WHERE verified = false AND onboarding_status != 'withdrawn'`,
    // Total follows
    db.$queryRaw<RawCount[]>`SELECT COUNT(*)::bigint AS count FROM mentor_follows`,
    // Pro subs (not mentor-direct)
    db.$queryRaw<RawCount[]>`SELECT COUNT(*)::bigint AS count FROM subscriptions WHERE tier = 'pro' AND status = 'active' AND mentor_id IS NULL`,
    // Direct subs
    db.$queryRaw<RawCount[]>`SELECT COUNT(*)::bigint AS count FROM subscriptions WHERE tier = 'pro' AND status = 'active' AND mentor_id IS NOT NULL`,
    // Escrow total
    db.$queryRaw<RawEscrow[]>`SELECT COALESCE(SUM(total_accrued), 0)::bigint AS total FROM mentor_escrow WHERE released = false`,
    // Recent follows (last 10)
    db.$queryRaw<RawFollowRow[]>`
      SELECT m.display_name, mf.followed_at
      FROM mentor_follows mf
      JOIN mentors m ON m.id = mf.mentor_id
      ORDER BY mf.followed_at DESC
      LIMIT 10
    `,
    // Recent trades
    db.$queryRaw<RawTradeRow[]>`
      SELECT pair, direction, setup_grade, created_at
      FROM trade_journal
      ORDER BY created_at DESC
      LIMIT 5
    `,
    // Recent requests
    db.$queryRaw<RawRequestRow[]>`
      SELECT mentor_name, vote_count, status, created_at
      FROM mentor_requests
      ORDER BY created_at DESC
      LIMIT 5
    `,
  ])

  const verified   = Number(verifiedCount[0]?.count ?? 0)
  const drafts     = Number(draftCount[0]?.count ?? 0)
  const followers  = Number(totalFollowers[0]?.count ?? 0)
  const proSubs    = Number(proSubCount[0]?.count ?? 0)
  const directSubs = Number(directSubCount[0]?.count ?? 0)
  const escrow     = Number(escrowTotal[0]?.total ?? 0)
  const mrr        = proSubs * 19.99 + directSubs * 9.99

  const follows: RecentFollow[]  = recentFollows.map(r => ({ mentor_name: r.display_name, followed_at: r.followed_at }))
  const trades:  RecentTrade[]   = recentTrades
  const requests: RecentRequest[] = recentRequests

  // ── Overview cards ─────────────────────────────────────────────────────────
  const cards = [
    {
      label:    'Total Mentors',
      value:    verified + drafts,
      sub:      `${verified} verified · ${drafts} drafts`,
      icon:     Users,
      color:    '#4d8eff',
      href:     '/admin/pipeline',
    },
    {
      label:    'Total Followers',
      value:    followers.toLocaleString(),
      sub:      'Across all mentors',
      icon:     TrendingUp,
      color:    '#00e5b0',
      href:     null,
    },
    {
      label:    'Pro Subscriptions',
      value:    (proSubs + directSubs).toLocaleString(),
      sub:      `MRR ~$${mrr.toFixed(0)}`,
      icon:     Activity,
      color:    '#a78bfa',
      href:     null,
    },
    {
      label:    'Escrow Balance',
      value:    `$${escrow.toFixed(2)}`,
      sub:      'Across unverified mentors',
      icon:     Lock,
      color:    '#fbbf24',
      href:     '/admin/payouts',
    },
  ]

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-1" style={{ letterSpacing: '-0.03em' }}>
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted">Platform overview and recent activity.</p>
      </div>

      {/* ── Overview cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          const inner = (
            <div
              className="rounded-2xl p-5 h-full"
              style={{
                background: 'var(--card)',
                border:     '1px solid var(--border)',
                borderTop:  `2px solid ${card.color}60`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono text-muted">{card.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
                >
                  <Icon size={14} style={{ color: card.color }} aria-hidden="true" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text font-mono mb-1" style={{ letterSpacing: '-0.02em' }}>
                {card.value}
              </p>
              <p className="text-2xs font-mono text-muted">{card.sub}</p>
              {card.href && (
                <div className="flex items-center gap-1 mt-2 text-2xs font-mono"
                  style={{ color: card.color }}
                >
                  View <ChevronRight size={10} />
                </div>
              )}
            </div>
          )
          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className="block hover:-translate-y-px transition-transform duration-150">
                {inner}
              </Link>
            )
          }
          return <div key={card.label}>{inner}</div>
        })}
      </div>

      {/* ── Recent activity ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent follows */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
              Recent Follows
            </span>
            <span className="text-2xs font-mono text-muted">Last {follows.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {follows.length === 0 ? (
              <p className="px-5 py-4 text-xs text-muted italic">No follows yet.</p>
            ) : follows.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-semibold text-text">→ {f.mentor_name}</p>
                  <p className="text-2xs font-mono text-muted">new follower</p>
                </div>
                <span className="text-2xs font-mono text-muted">{relTime(new Date(f.followed_at))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent trades */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
              Recent Trades
            </span>
            <Link href="/admin" className="text-2xs font-mono text-accent">View all</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {trades.length === 0 ? (
              <p className="px-5 py-4 text-xs text-muted italic">No trades yet.</p>
            ) : trades.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-text">{t.pair}</span>
                  <span
                    className="text-2xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: t.direction === 'long' ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
                      color:      t.direction === 'long' ? 'var(--accent)' : 'var(--danger)',
                      border:     `1px solid ${t.direction === 'long' ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
                    }}
                  >
                    {t.direction.toUpperCase()}
                  </span>
                  {t.setup_grade && (
                    <span className="text-2xs font-mono text-muted">{t.setup_grade}</span>
                  )}
                </div>
                <span className="text-2xs font-mono text-muted">{relTime(new Date(t.created_at))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent requests */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-bold text-text" style={{ letterSpacing: '-0.01em' }}>
              Mentor Requests
            </span>
            <Link href="/admin/requests" className="text-2xs font-mono text-accent">View all</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {requests.length === 0 ? (
              <p className="px-5 py-4 text-xs text-muted italic">No requests yet.</p>
            ) : requests.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-semibold text-text">{r.mentor_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xs font-mono text-accent">▲ {r.vote_count}</span>
                    <span
                      className="text-2xs font-mono px-1 py-px rounded"
                      style={{
                        background: `${STATUS_COLORS[r.status] ?? '#6b7fa3'}15`,
                        color:       STATUS_COLORS[r.status] ?? '#6b7fa3',
                        border:      `1px solid ${STATUS_COLORS[r.status] ?? '#6b7fa3'}30`,
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
                <span className="text-2xs font-mono text-muted">{relTime(new Date(r.created_at))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick links ────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/add-mentor', label: '+ Add Mentor',     color: 'var(--accent)' },
          { href: '/admin/pipeline',   label: 'View Pipeline',    color: '#4d8eff' },
          { href: '/admin/payouts',    label: 'Process Payouts',  color: '#fbbf24' },
          { href: '/admin/requests',   label: 'Review Requests',  color: '#a78bfa' },
        ].map(link => (
          <Link
            key={link.href} href={link.href}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:brightness-110"
            style={{
              background: 'var(--card)',
              border:     `1px solid var(--border)`,
              color:       link.color,
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <p className="text-2xs font-mono text-muted text-center mt-8">
        Not financial advice. Trading carries substantial risk.
      </p>
    </div>
  )
}
