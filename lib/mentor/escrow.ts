// lib/mentor/escrow.ts
// Core payout and escrow logic — used by API routes and (in Phase 2) by cron jobs.
//
// Revenue model:
//   Pro tier ($19.99/mo):   60% platform / 40% mentor pool, distributed by usage points
//   Mentor Direct ($9.99):  50% platform / 50% to that specific mentor
//   Unverified mentors:     same calculation, payout goes to escrow (not Stripe)
//   Escrow expires:         12 months after first accrual (ToS §8.3)

import { db } from '@/lib/db'

// ─── Constants ────────────────────────────────────────────────────────────────

export const PRO_PRICE         = 19.99
export const DIRECT_PRICE      =  9.99
export const PRO_MENTOR_SHARE  = 0.40   // 40% of Pro revenue to the mentor pool
export const DIRECT_SHARE      = 0.50   // 50% of Direct revenue to the mentor

export const POINT_WEIGHTS = {
  checklist_open: 1,
  time_spent:     1,   // per 5 minutes (duration_seconds / 300)
  trade_logged:   2,
  trade_executed: 3,
} as const

export const ESCROW_EXPIRY_MONTHS = 12

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutResult {
  mentor_id:        string
  period_start:     Date
  period_end:       Date
  pro_share_amount: number
  direct_amount:    number
  total_amount:     number
  points:           number
  /** 'pending' = verified + Stripe connected → ready to transfer
   *  'accrued' = unverified → added to escrow     */
  status:           'pending' | 'accrued'
}

export interface EscrowReleaseResult {
  payout_id: string
  amount:    number
  mentor_id: string
}

export interface EscrowExpiryResult {
  expired_count:  number
  total_expired:  number   // USD
  mentor_ids:     string[]
}

// ─── calculateMonthlyPayouts ──────────────────────────────────────────────────
// Calculate usage-based revenue shares for all active mentors in a period.
// Creates MentorPayout records and updates escrow for unverified mentors.
// Returns the list of payout results (does not include zero-amount mentors).

export async function calculateMonthlyPayouts(
  periodStart: Date,
  periodEnd:   Date,
): Promise<PayoutResult[]> {

  // ── 1. Count active subscriptions ───────────────────────────────────────────

  const [proSubCount, directSubs] = await Promise.all([
    // Pure Pro subs (no mentor_id = platform-wide)
    db.subscription.count({
      where: { tier: 'pro', status: 'active', mentor_id: null },
    }),
    // Mentor Direct subs (tied to a specific mentor)
    db.subscription.findMany({
      where:  { tier: 'pro', status: 'active', mentor_id: { not: null } },
      select: { mentor_id: true },
    }),
  ])

  const totalProRevenue  = proSubCount * PRO_PRICE
  const proMentorPool    = totalProRevenue * PRO_MENTOR_SHARE

  // Direct revenue per mentor
  const directByMentor: Record<string, number> = {}
  for (const sub of directSubs) {
    if (sub.mentor_id) {
      directByMentor[sub.mentor_id] =
        (directByMentor[sub.mentor_id] ?? 0) + DIRECT_PRICE * DIRECT_SHARE
    }
  }

  // ── 2. Usage points per mentor for this period ───────────────────────────

  type RawPoints = { mentor_id: string; total_points: bigint }
  const usageRows = await db.$queryRaw<RawPoints[]>`
    SELECT
      p.mentor_id,
      SUM(
        CASE
          WHEN pu.event_type = 'checklist_open'  THEN ${POINT_WEIGHTS.checklist_open}
          WHEN pu.event_type = 'trade_logged'     THEN ${POINT_WEIGHTS.trade_logged}
          WHEN pu.event_type = 'trade_executed'   THEN ${POINT_WEIGHTS.trade_executed}
          WHEN pu.event_type = 'time_spent'
            THEN FLOOR(COALESCE(pu.duration_seconds, 0) / 300)
          ELSE 0
        END
      )::bigint AS total_points
    FROM playbook_usage pu
    JOIN playbooks p ON p.id = pu.playbook_id
    WHERE pu.created_at >= ${periodStart}
      AND pu.created_at <  ${periodEnd}
    GROUP BY p.mentor_id
  `

  const totalPoints = usageRows.reduce((sum, r) => sum + Number(r.total_points), 0)

  // ── 3. Fetch all active (non-withdrawn) mentors ──────────────────────────

  const mentors = await db.mentor.findMany({
    where:  { onboarding_status: { not: 'withdrawn' } },
    select: { id: true, verified: true, stripe_connect_id: true },
  })

  // ── 4. Build payout records ───────────────────────────────────────────────

  const results: PayoutResult[] = mentors
    .map(m => {
      const points      = Number(usageRows.find(r => r.mentor_id === m.id)?.total_points ?? 0)
      const proShare    = totalPoints > 0 ? (points / totalPoints) * proMentorPool : 0
      const directShare = directByMentor[m.id] ?? 0
      const total       = proShare + directShare
      const status      = m.verified && m.stripe_connect_id ? 'pending' : 'accrued'

      return { mentor_id: m.id, period_start: periodStart, period_end: periodEnd,
               pro_share_amount: proShare, direct_amount: directShare,
               total_amount: total, points, status } as PayoutResult
    })
    .filter(p => p.total_amount > 0)

  // ── 5. Persist payout rows ────────────────────────────────────────────────

  await db.$transaction(
    results.map(p =>
      db.mentorPayout.create({
        data: {
          mentor_id:        p.mentor_id,
          period_start:     p.period_start,
          period_end:       p.period_end,
          pro_share_amount: p.pro_share_amount,
          direct_amount:    p.direct_amount,
          total_amount:     p.total_amount,
          status:           p.status,
        },
      })
    )
  )

  // ── 6. Update escrow for unverified mentors ───────────────────────────────
  //       Upsert: create the escrow row if it doesn't exist yet.

  const unverifiedPayouts = results.filter(p => p.status === 'accrued')

  for (const p of unverifiedPayouts) {
    await db.mentorEscrow.upsert({
      where:  { mentor_id: p.mentor_id },
      create: {
        mentor_id:         p.mentor_id,
        total_accrued:     p.total_amount,
        last_calculated_at: new Date(),
      },
      update: {
        total_accrued:      { increment: p.total_amount },
        last_calculated_at: new Date(),
      },
    })
  }

  return results
}

// ─── releaseEscrow ────────────────────────────────────────────────────────────
// Called when a mentor verifies and connects Stripe.
// Creates a 'pending' payout for their full accrued balance.
// Marks the escrow row as released.

export async function releaseEscrow(mentorId: string): Promise<EscrowReleaseResult> {
  const escrow = await db.mentorEscrow.findFirst({
    where: { mentor_id: mentorId, released: false },
  })

  if (!escrow) {
    throw new Error(`No unreleased escrow found for mentor ${mentorId}`)
  }

  if (Number(escrow.total_accrued) <= 0) {
    throw new Error(`Escrow balance is zero for mentor ${mentorId}`)
  }

  // Verify mentor is actually verified + has Stripe
  const mentor = await db.mentor.findUnique({
    where:  { id: mentorId },
    select: { verified: true, stripe_connect_id: true },
  })

  if (!mentor?.verified) {
    throw new Error(`Mentor ${mentorId} is not yet verified`)
  }
  if (!mentor.stripe_connect_id) {
    throw new Error(`Mentor ${mentorId} has no Stripe Connect account linked`)
  }

  const amount = Number(escrow.total_accrued)

  // Create the payout and mark escrow released atomically
  const [payout] = await db.$transaction([
    db.mentorPayout.create({
      data: {
        mentor_id:        mentorId,
        period_start:     escrow.last_calculated_at,
        period_end:       new Date(),
        pro_share_amount: amount,   // full escrow → pro_share for simplicity
        direct_amount:    0,
        total_amount:     amount,
        status:           'pending',
      },
      select: { id: true },
    }),
    db.mentorEscrow.update({
      where: { id: escrow.id },
      data:  {
        released:    true,
        released_at: new Date(),
        // released_to_payout_id set after we have the payout ID — see below
      },
    }),
  ])

  // Link escrow → payout (second update, non-atomic but audit trail is intact)
  await db.mentorEscrow.update({
    where: { id: escrow.id },
    data:  { released_to_payout_id: payout.id },
  })

  return { payout_id: payout.id, amount, mentor_id: mentorId }
}

// ─── expireOldEscrow ──────────────────────────────────────────────────────────
// Runs on a monthly basis (called from the admin panel or a cron).
// Finds escrow balances older than ESCROW_EXPIRY_MONTHS and marks them expired.
// Expiry = last_calculated_at > 12 months ago AND released = false.
//
// Uses last_calculated_at as the expiry anchor because:
//   - It is set on first escrow creation
//   - If a mentor has accrued *any* amount in the past 12 months,
//     last_calculated_at was reset → they're still in the window
//   - This means the 12-month clock resets whenever they earn, which is fair
//     (they're still an active earner)
//
// Audit trail: creates a MentorPayout with status='failed' for the expired amount,
// then sets total_accrued=0 and released=true on the escrow row.

export async function expireOldEscrow(): Promise<EscrowExpiryResult> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - ESCROW_EXPIRY_MONTHS)

  const expiredEscrows = await db.mentorEscrow.findMany({
    where: {
      released:          false,
      total_accrued:     { gt: 0 },
      last_calculated_at: { lt: cutoff },
    },
    select: {
      id:                 true,
      mentor_id:          true,
      total_accrued:      true,
      last_calculated_at: true,
    },
  })

  if (expiredEscrows.length === 0) {
    return { expired_count: 0, total_expired: 0, mentor_ids: [] }
  }

  let totalExpired = 0
  const expiredMentorIds: string[] = []

  for (const escrow of expiredEscrows) {
    const amount = Number(escrow.total_accrued)
    totalExpired += amount
    expiredMentorIds.push(escrow.mentor_id)

    // Audit record — failed payout marks the forfeited amount
    const auditPayout = await db.mentorPayout.create({
      data: {
        mentor_id:        escrow.mentor_id,
        period_start:     escrow.last_calculated_at,
        period_end:       new Date(),
        pro_share_amount: amount,
        direct_amount:    0,
        total_amount:     amount,
        status:           'failed',
        // Stripe transfer ID field repurposed as expiry marker for audit trail
        stripe_transfer_id: `ESCROW_EXPIRED_${new Date().toISOString().slice(0, 10)}`,
      },
      select: { id: true },
    })

    // Mark escrow as released (= closed) with zero balance
    await db.mentorEscrow.update({
      where: { id: escrow.id },
      data: {
        released:              true,
        released_at:           new Date(),
        released_to_payout_id: auditPayout.id,
        total_accrued:         0,
      },
    })
  }

  return {
    expired_count:  expiredEscrows.length,
    total_expired:  totalExpired,
    mentor_ids:     expiredMentorIds,
  }
}

// ─── getEscrowAgeWarnings ─────────────────────────────────────────────────────
// Returns escrow rows approaching the 12-month cutoff (within 60 days).
// Used in the admin UI to show a warning before funds expire.

export async function getEscrowAgeWarnings(): Promise<
  Array<{ mentor_id: string; days_until_expiry: number; amount: number }>
> {
  const warnDate = new Date()
  warnDate.setMonth(warnDate.getMonth() - (ESCROW_EXPIRY_MONTHS - 2))   // 10 months ago

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - ESCROW_EXPIRY_MONTHS)             // 12 months ago

  const atRisk = await db.mentorEscrow.findMany({
    where: {
      released:           false,
      total_accrued:      { gt: 0 },
      last_calculated_at: { lt: warnDate, gte: cutoff },  // 10–12 months old
    },
    select: {
      mentor_id:          true,
      total_accrued:      true,
      last_calculated_at: true,
    },
  })

  return atRisk.map(e => {
    const expiresAt = new Date(e.last_calculated_at)
    expiresAt.setMonth(expiresAt.getMonth() + ESCROW_EXPIRY_MONTHS)
    const daysUntil = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return {
      mentor_id:         e.mentor_id,
      days_until_expiry: daysUntil,
      amount:            Number(e.total_accrued),
    }
  })
}
