// app/api/admin/payouts/route.ts
//
// GET  /api/admin/payouts — list pending + recent payouts + escrow balances + age warnings
// POST /api/admin/payouts — calculate | release_escrow | expire_escrow
// PATCH /api/admin/payouts — update payout status
//        body: { payout_id, status }

import { NextResponse, type NextRequest } from 'next/server'
import { z }            from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import {
  calculateMonthlyPayouts,
  releaseEscrow,
  expireOldEscrow,
  getEscrowAgeWarnings,
} from '@/lib/mentor/escrow'

// ─── Admin gate ───────────────────────────────────────────────────────────────

async function assertAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient()
  if (!await assertAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [payouts, escrows, warnings] = await Promise.all([
      db.mentorPayout.findMany({
        orderBy: { created_at: 'desc' },
        take:    100,
        select: {
          id:                true,
          mentor_id:         true,
          period_start:      true,
          period_end:        true,
          pro_share_amount:  true,
          direct_amount:     true,
          total_amount:      true,
          status:            true,
          stripe_transfer_id: true,
          created_at:        true,
          mentor: {
            select: {
              display_name:      true,
              handle:            true,
              avatar_emoji:      true,
              verified:          true,
              stripe_connect_id: true,
            },
          },
        },
      }),

      db.mentorEscrow.findMany({
        where:   { released: false },
        select: {
          id:                  true,
          mentor_id:           true,
          total_accrued:       true,
          last_calculated_at:  true,
          mentor: {
            select: {
              display_name:      true,
              handle:            true,
              avatar_emoji:      true,
              verified:          true,
              stripe_connect_id: true,
              onboarding_status: true,
            },
          },
        },
      }),

      getEscrowAgeWarnings(),
    ])

    const serialisedPayouts = payouts.map(p => ({
      ...p,
      pro_share_amount: Number(p.pro_share_amount),
      direct_amount:    Number(p.direct_amount),
      total_amount:     Number(p.total_amount),
      period_start:     p.period_start.toISOString(),
      period_end:       p.period_end.toISOString(),
      created_at:       p.created_at.toISOString(),
    }))

    const serialisedEscrows = escrows.map(e => ({
      ...e,
      total_accrued:      Number(e.total_accrued),
      last_calculated_at: e.last_calculated_at.toISOString(),
    }))

    return NextResponse.json({
      payouts:  serialisedPayouts,
      escrows:  serialisedEscrows,
      warnings, // Array<{ mentor_id, days_until_expiry, amount }>
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payouts] GET error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH — update payout status ─────────────────────────────────────────────

const PatchSchema = z.object({
  payout_id:          z.string().uuid(),
  status:             z.enum(['pending', 'processing', 'paid', 'failed']),
  stripe_transfer_id: z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  if (!await assertAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })
  }

  const { payout_id, status, stripe_transfer_id } = parsed.data

  try {
    const updated = await db.mentorPayout.update({
      where:  { id: payout_id },
      data:   {
        status,
        ...(stripe_transfer_id ? { stripe_transfer_id } : {}),
      },
      select: { id: true, status: true },
    })
    return NextResponse.json({ payout: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payouts] PATCH error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — calculate payouts | release escrow | expire escrow ─────────────────

const CalculateSchema = z.object({
  action:       z.literal('calculate'),
  period_start: z.string().datetime(),
  period_end:   z.string().datetime(),
})

const ReleaseEscrowSchema = z.object({
  action:    z.literal('release_escrow'),
  mentor_id: z.string().uuid(),
})

const ExpireEscrowSchema = z.object({
  action: z.literal('expire_escrow'),
})

const PostSchema = z.discriminatedUnion('action', [
  CalculateSchema,
  ReleaseEscrowSchema,
  ExpireEscrowSchema,
])

export async function POST(request: NextRequest) {
  const supabase = createClient()
  if (!await assertAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })
  }

  if (parsed.data.action === 'release_escrow') {
    return handleReleaseEscrow(parsed.data.mentor_id)
  }

  if (parsed.data.action === 'expire_escrow') {
    return handleExpireEscrow()
  }

  return handleCalculatePayouts(
    new Date(parsed.data.period_start),
    new Date(parsed.data.period_end),
  )
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCalculatePayouts(periodStart: Date, periodEnd: Date) {
  try {
    const results = await calculateMonthlyPayouts(periodStart, periodEnd)
    return NextResponse.json({
      created:      results.length,
      total_payout: results.reduce((s, p) => s + p.total_amount, 0),
      period_start: periodStart.toISOString(),
      period_end:   periodEnd.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payouts] calculate error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleReleaseEscrow(mentorId: string) {
  try {
    const result = await releaseEscrow(mentorId)
    return NextResponse.json({
      payout_id: result.payout_id,
      amount:    result.amount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payouts] release_escrow error:', message)
    // Surface specific validation errors (not verified, no Stripe, etc.)
    const isUserError = message.includes('not yet verified') ||
      message.includes('no Stripe') ||
      message.includes('No unreleased escrow') ||
      message.includes('balance is zero')
    return NextResponse.json(
      { error: message },
      { status: isUserError ? 400 : 500 },
    )
  }
}

async function handleExpireEscrow() {
  try {
    const result = await expireOldEscrow()
    return NextResponse.json({
      expired_count: result.expired_count,
      total_expired: result.total_expired,
      mentor_ids:    result.mentor_ids,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payouts] expire_escrow error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
