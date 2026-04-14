// app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout Session for Pro or Mentor Direct subscriptions.
//
// POST /api/stripe/checkout
// Body: { tier: 'pro' | 'mentor_direct', mentorId?: string }
//
// Returns: { url: string } — redirect the browser to this URL
//
// Auth: requires a valid Supabase session (checked via createClient).
// The webhook (app/api/stripe/webhook/route.ts) handles post-payment DB updates.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/server'
import { PRICES } from '@/lib/stripe/prices'

// ─── Request schema ───────────────────────────────────────────────────────────

const CheckoutBodySchema = z.object({
  tier: z.enum(['pro', 'mentor_direct']),
  /** Required when tier === 'mentor_direct' — the mentor being subscribed to */
  mentorId: z.string().uuid().optional(),
})

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { tier, mentorId } = parsed.data

  // mentor_direct requires a mentorId
  if (tier === 'mentor_direct' && !mentorId) {
    return NextResponse.json(
      { error: 'mentorId is required for mentor_direct tier' },
      { status: 400 },
    )
  }

  // ── 3. Resolve price ID ───────────────────────────────────────────────────
  const priceId = tier === 'pro' ? PRICES.PRO_MONTHLY : PRICES.MENTOR_DIRECT_MONTHLY

  if (!priceId) {
    console.error('[checkout] Missing Stripe price ID for tier:', tier)
    return NextResponse.json(
      { error: 'Stripe price not configured for this tier' },
      { status: 500 },
    )
  }

  // ── 4. Block double-subscription ─────────────────────────────────────────
  // Prevent a user from opening a new checkout for a tier they already have
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('tier', tier)
    .in('status', ['active', 'past_due'])
    .maybeSingle()

  if (existingSub) {
    return NextResponse.json(
      {
        error:
          tier === 'pro'
            ? 'You already have an active Pro subscription.'
            : 'You already have an active subscription for this mentor.',
      },
      { status: 409 },
    )
  }

  // ── 5. Create Stripe Checkout Session ────────────────────────────────────
  try {
    const session = await createCheckoutSession({
      userId: user.id,
      priceId,
      mentorId,
    })

    if (!session.url) {
      throw new Error('Stripe returned a session with no URL')
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[checkout] createCheckoutSession failed:', message)
    return NextResponse.json(
      { error: 'Could not create checkout session. Please try again.' },
      { status: 500 },
    )
  }
}
