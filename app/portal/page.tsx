// app/portal/page.tsx
// Mentor portal dashboard — the business command centre.
//
// Server Component: fetches all analytics data directly via Prisma, serialises
// for client components. No loading spinners — all data arrives on first paint.
//
// Data fetched in parallel:
//   · Mentor row + latest playbook
//   · Follower counts (total, pro, direct) via raw SQL joins
//   · Follower growth by month (last 6 months)
//   · Payout history + escrow balance
//   · Usage by event_type (all time)
//   · Usage by month (last 6 months)
//   · Top followers by points (anonymised)

import type { Metadata }  from 'next'
import { redirect }       from 'next/navigation'
import { format, subMonths, startOfMonth } from 'date-fns'
import { createClient }   from '@/lib/supabase/server'
import { db }             from '@/lib/db'
import { FollowerStats }  from '@/components/portal/follower-stats'
import { RevenueCard }    from '@/components/portal/revenue-card'
import { AnalyticsDashboard } from '@/components/portal/analytics-dashboard'
import type { FollowerGrowthPoint }  from '@/components/portal/follower-stats'
import type { PayoutRecord }         from '@/components/portal/revenue-card'
import type { UsageByMonthPoint, TopFollower } from '@/components/portal/analytics-dashboard'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Mentor Dashboard — Playbuuk',
  description: 'Track your follower growth, revenue, and playbook engagement in one place.',
  robots:      { index: false },   // portal is private
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Hash a UUID into a 4-digit number for anonymous display */
function anonymizeUserId(userId: string): string {
  let hash = 0
  for (const char of userId) {
    hash = ((hash * 31) + char.charCodeAt(0)) & 0xffff
  }
  return `Trader #${hash.toString().padStart(4, '0')}`
}

/** Build month labels for the last N months, including empty months */
function buildMonthGrid(n: number): { key: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(startOfMonth(now), n - 1 - i)
    return {
      key:   format(d, 'yyyy-MM'),
      label: format(d, 'MMM'),
    }
  })
}

/** Relative time label for last active */
function relativeLabel(date: Date): string {
  const diff  = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

// ─── Raw query result types ───────────────────────────────────────────────────

type RawFollowCount     = { count: bigint }
type RawGrowthRow       = { month: string; count: bigint }
type RawUsageTypeRow    = { event_type: string; count: bigint }
type RawUsageMonthRow   = { month: string; event_type: string; count: bigint }
type RawTopFollowerRow  = { user_id: string; total_points: bigint; last_active_at: Date }
type RawProFollowerRow  = { user_id: string; tier: string }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch mentor row + playbook ──────────────────────────────────────────
  const mentor = await db.mentor.findFirst({
    where:  { user_id: user.id },
    select: {
      id:               true,
      display_name:     true,
      handle:           true,
      avatar_emoji:     true,
      verified:         true,
      verified_at:      true,
      follower_count:   true,
      stripe_connect_id: true,
      onboarding_status: true,
      playbooks: {
        orderBy: { version: 'desc' },
        take:    1,
        select: {
          id:            true,
          strategy_name: true,
          version:       true,
        },
      },
    },
  })

  // Admin with no linked mentor → placeholder state
  if (!mentor) {
    return (
      <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ border: '1px dashed var(--border)' }}
        >
          <p className="text-sm font-semibold text-dim">No mentor profile linked to your account.</p>
          <p className="text-xs text-muted mt-1.5">Ask an admin to link your profile to a mentor row.</p>
        </div>
      </main>
    )
  }

  const mentorId  = mentor.id
  const playbook  = mentor.playbooks[0] ?? null
  const playbookId = playbook?.id ?? null

  // ── All async queries in parallel ────────────────────────────────────────
  const sixMonthsAgo = subMonths(new Date(), 6)

  const [
    proFollowersResult,
    directFollowersResult,
    growthData,
    payouts,
    escrow,
    usageByType,
    usageByMonth,
    topFollowers,
    proFollowerUsers,
  ] = await Promise.all([

    // Count of followers with active Pro subscription
    db.$queryRaw<RawFollowCount[]>`
      SELECT COUNT(DISTINCT mf.user_id) AS count
      FROM   mentor_follows mf
      INNER  JOIN subscriptions s ON s.user_id = mf.user_id
      WHERE  mf.mentor_id = ${mentorId}::uuid
        AND  s.tier       = 'pro'
        AND  s.status     = 'active'
    `,

    // Count of direct (mentor_direct) subscribers
    db.$queryRaw<RawFollowCount[]>`
      SELECT COUNT(*) AS count
      FROM   subscriptions
      WHERE  mentor_id = ${mentorId}::uuid
        AND  tier      = 'mentor_direct'
        AND  status    = 'active'
    `,

    // New follows per month over last 6 months
    db.$queryRaw<RawGrowthRow[]>`
      SELECT TO_CHAR(followed_at, 'YYYY-MM') AS month,
             COUNT(*)                        AS count
      FROM   mentor_follows
      WHERE  mentor_id   = ${mentorId}::uuid
        AND  followed_at >= ${sixMonthsAgo}
      GROUP  BY TO_CHAR(followed_at, 'YYYY-MM')
      ORDER  BY month ASC
    `,

    // Payout history (last 12 months)
    db.mentorPayout.findMany({
      where:   { mentor_id: mentorId },
      orderBy: { period_start: 'desc' },
      take:    12,
    }),

    // Escrow balance
    db.mentorEscrow.findUnique({
      where:  { mentor_id: mentorId },
      select: { total_accrued: true, released: true },
    }),

    // Usage totals by event type (all time, for this mentor's playbook)
    playbookId
      ? db.$queryRaw<RawUsageTypeRow[]>`
          SELECT event_type, COUNT(*) AS count
          FROM   playbook_usage
          WHERE  playbook_id = ${playbookId}::uuid
          GROUP  BY event_type
        `
      : Promise.resolve([] as RawUsageTypeRow[]),

    // Usage by month + event type (last 6 months)
    playbookId
      ? db.$queryRaw<RawUsageMonthRow[]>`
          SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                 event_type,
                 COUNT(*)                       AS count
          FROM   playbook_usage
          WHERE  playbook_id = ${playbookId}::uuid
            AND  created_at >= ${sixMonthsAgo}
          GROUP  BY TO_CHAR(created_at, 'YYYY-MM'), event_type
          ORDER  BY month ASC
        `
      : Promise.resolve([] as RawUsageMonthRow[]),

    // Top 10 followers by engagement points (last 90 days)
    playbookId
      ? db.$queryRaw<RawTopFollowerRow[]>`
          SELECT user_id,
                 SUM(CASE
                   WHEN event_type = 'checklist_open'  THEN 1
                   WHEN event_type = 'time_spent'      THEN 1
                   WHEN event_type = 'trade_logged'    THEN 2
                   WHEN event_type = 'trade_executed'  THEN 3
                   ELSE 0
                 END)                AS total_points,
                 MAX(created_at)     AS last_active_at
          FROM   playbook_usage
          WHERE  playbook_id = ${playbookId}::uuid
            AND  created_at >= NOW() - INTERVAL '90 days'
          GROUP  BY user_id
          ORDER  BY total_points DESC
          LIMIT  10
        `
      : Promise.resolve([] as RawTopFollowerRow[]),

    // Pro status for top followers (to show PRO badge — no identity leak)
    playbookId
      ? db.$queryRaw<RawProFollowerRow[]>`
          SELECT pu.user_id, s.tier
          FROM (
            SELECT DISTINCT user_id FROM playbook_usage
            WHERE playbook_id = ${playbookId}::uuid
          ) pu
          LEFT JOIN subscriptions s
            ON s.user_id = pu.user_id
           AND s.status  = 'active'
           AND s.tier    IN ('pro', 'mentor_direct')
        `
      : Promise.resolve([] as RawProFollowerRow[]),
  ])

  // ── Serialise raw data ────────────────────────────────────────────────────

  const proFollowerCount    = Number((proFollowersResult[0]  as RawFollowCount)?.count  ?? 0)
  const directFollowerCount = Number((directFollowersResult[0] as RawFollowCount)?.count ?? 0)

  // Build 6-month grid and fill from raw data
  const monthGrid = buildMonthGrid(6)
  const growthMap  = new Map<string, number>(
    (growthData as RawGrowthRow[]).map(r => [r.month, Number(r.count)]),
  )

  let cumulative = mentor.follower_count - (growthMap.get(monthGrid.at(-1)?.key ?? '') ?? 0)
  const growthByMonth: FollowerGrowthPoint[] = monthGrid.map(({ key, label }) => {
    const newFollows = growthMap.get(key) ?? 0
    cumulative += newFollows
    return { month: key, label, newFollows, cumulative }
  })

  // Payouts
  const serialisedPayouts: PayoutRecord[] = payouts.map(p => ({
    id:           p.id,
    periodLabel:  format(p.period_start, 'MMM yyyy'),
    totalAmount:  Number(p.total_amount),
    proAmount:    Number(p.pro_share_amount),
    directAmount: Number(p.direct_amount),
    status:       p.status as PayoutRecord['status'],
    paidAt:       p.status === 'paid' ? p.updated_at.toISOString() : null,
  }))

  const escrowBalance = escrow && !escrow.released
    ? Number(escrow.total_accrued)
    : 0

  const totalEarned = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.total_amount), 0)

  // Estimate this month: last paid payout or escrow growth
  const lastPaid = payouts.find(p => p.status === 'paid')
  const estimatedThisMonth = lastPaid ? Number(lastPaid.total_amount) * 0.95 : 0

  // Usage totals
  const usageMap = new Map<string, number>(
    (usageByType as RawUsageTypeRow[]).map(r => [r.event_type, Number(r.count)]),
  )
  const checklistOpens   = usageMap.get('checklist_open') ?? 0
  const timeSpentEvents  = usageMap.get('time_spent')     ?? 0
  const tradesLogged     = usageMap.get('trade_logged')   ?? 0
  const tradesExecuted   = usageMap.get('trade_executed') ?? 0

  // time_spent events × 5 min each
  const timeSpentMinutes = timeSpentEvents * 5

  // Total usage points
  const totalPoints = checklistOpens + timeSpentEvents + (tradesLogged * 2) + (tradesExecuted * 3)

  // Usage by month — pivot to UsageByMonthPoint[]
  const usageMonthMap = new Map<string, Record<string, number>>()
  for (const row of (usageByMonth as RawUsageMonthRow[])) {
    const existing = usageMonthMap.get(row.month) ?? {}
    existing[row.event_type] = Number(row.count)
    usageMonthMap.set(row.month, existing)
  }

  const byMonth: UsageByMonthPoint[] = monthGrid.map(({ key, label }) => {
    const m = usageMonthMap.get(key) ?? {}
    return {
      month:          key,
      label,
      checklistOpens: m['checklist_open'] ?? 0,
      timeSpent:      m['time_spent']     ?? 0,
      tradesLogged:   m['trade_logged']   ?? 0,
      tradesExecuted: m['trade_executed'] ?? 0,
    }
  })

  // Top followers
  const proUserIds = new Set(
    (proFollowerUsers as RawProFollowerRow[])
      .filter(r => r.tier)
      .map(r => r.user_id),
  )

  const topFollowersList: TopFollower[] = (topFollowers as RawTopFollowerRow[]).map(r => ({
    anonymousId:     anonymizeUserId(r.user_id),
    totalPoints:     Number(r.total_points),
    lastActiveLabel: relativeLabel(new Date(r.last_active_at)),
    isPro:           proUserIds.has(r.user_id),
  }))

  // This month's net new followers
  const thisMonthNew = growthByMonth.at(-1)?.newFollows ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 max-w-[1400px] mx-auto">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-text"
            style={{ letterSpacing: '-0.03em' }}
          >
            Mentor Dashboard
          </h1>
          <p className="text-sm text-dim mt-1">
            Welcome back,{' '}
            <span className="font-semibold text-text">{mentor.display_name}</span>{' '}
            {mentor.avatar_emoji ?? '👋'}
            {thisMonthNew > 0 && (
              <span className="ml-2 text-xs font-mono" style={{ color: 'var(--accent)' }}>
                +{thisMonthNew.toLocaleString()} new followers this month
              </span>
            )}
          </p>
        </div>

        {/* Est. this month pill */}
        {estimatedThisMonth > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-shrink-0"
            style={{
              background: 'rgba(0,229,176,0.06)',
              border:     '1px solid rgba(0,229,176,0.2)',
            }}
          >
            <span className="text-xs font-mono text-muted">Est. this month</span>
            <span
              className="text-base font-bold font-mono tabular-nums"
              style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}
            >
              ${estimatedThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* ── Playbook status bar ───────────────────────────────────────────── */}
      {!mentor.verified && (
        <div
          className="flex items-start sm:items-center justify-between gap-4 rounded-2xl px-5 py-4 mb-6"
          style={{
            background: 'rgba(251,191,36,0.04)',
            border:     '1px solid rgba(251,191,36,0.2)',
            borderLeft: '3px solid rgba(251,191,36,0.5)',
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>
              Playbook not yet verified
            </p>
            <p className="text-xs text-dim mt-0.5 leading-relaxed">
              Review your AI-drafted playbook and submit it for approval to get the verified badge
              and unlock Stripe payouts.
            </p>
          </div>
          <a
            href="/portal/playbook"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap"
            style={{
              background: 'rgba(251,191,36,0.1)',
              border:     '1px solid rgba(251,191,36,0.3)',
              color:      'var(--gold)',
            }}
          >
            Review Playbook →
          </a>
        </div>
      )}

      {/* ── Follower stats + growth ───────────────────────────────────────── */}
      <section className="mb-8">
        <FollowerStats
          totalFollowers={mentor.follower_count}
          proFollowers={proFollowerCount}
          directFollowers={directFollowerCount}
          growthByMonth={growthByMonth}
        />
      </section>

      {/* ── Revenue card (full width below lg, right col on xl) ──────────── */}
      <div className="mb-8">
        <RevenueCard
          estimatedThisMonth={estimatedThisMonth}
          totalEarned={totalEarned}
          escrowBalance={escrowBalance}
          isVerified={mentor.verified}
          hasStripeConnect={!!mentor.stripe_connect_id}
          payouts={serialisedPayouts}
        />
      </div>

      {/* ── Analytics: usage + top followers ─────────────────────────────── */}
      <AnalyticsDashboard
        checklistOpens={checklistOpens}
        timeSpentMinutes={timeSpentMinutes}
        tradesLogged={tradesLogged}
        tradesExecuted={tradesExecuted}
        totalPoints={totalPoints}
        byMonth={byMonth}
        topFollowers={topFollowersList}
      />

      {/* Disclaimer */}
      <footer
        className="mt-12 pt-6 text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-xs text-muted font-mono">
          Revenue estimates are indicative only — final amounts calculated at month end.
          Not financial advice. Trading carries substantial risk.
        </p>
      </footer>
    </main>
  )
}
