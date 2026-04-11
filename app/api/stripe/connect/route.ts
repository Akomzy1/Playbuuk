// app/api/stripe/connect/route.ts
// Stripe Connect webhook handler.
//
// Events handled:
//   account.updated → sync mentor's Connect account status, mark verified when charges enabled
//
// Uses a separate webhook secret (STRIPE_CONNECT_WEBHOOK_SECRET) from the main
// subscription webhook. Register this endpoint separately in the Stripe dashboard
// under Connect → Webhooks.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { OnboardingStatus } from '@/lib/supabase/types'

// ─── Zod schema for the fields we read from account.updated ──────────────────

const AccountSchema = z.object({
  id: z.string(),
  charges_enabled: z.boolean(),
  payouts_enabled: z.boolean(),
  details_submitted: z.boolean(),
  metadata: z.record(z.string(), z.string()).default({}),
})

// ─── Derive onboarding_status from Connect account state ─────────────────────

function onboardingStatusFromAccount(
  account: z.infer<typeof AccountSchema>,
): OnboardingStatus {
  if (account.charges_enabled && account.payouts_enabled) return 'verified'
  if (account.details_submitted) return 'under_review'
  return 'invitation_sent'
}

// ─── Event handler ────────────────────────────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account) {
  const parsed = AccountSchema.parse(account)
  const supabase = createAdminClient()

  // Find the mentor row by stripe_connect_id
  const { data: mentor } = await supabase
    .from('mentors')
    .select('id, onboarding_status')
    .eq('stripe_connect_id', parsed.id)
    .maybeSingle()

  if (!mentor) {
    // Connect account not yet linked to a mentor — may arrive before our DB write
    console.warn('[connect-webhook] account.updated: no mentor for connect_id', parsed.id)
    return
  }

  const newStatus = onboardingStatusFromAccount(parsed)
  const isNowVerified = newStatus === 'verified'

  console.log('[connect-webhook] account.updated', {
    mentorId: mentor.id,
    connectId: parsed.id,
    charges_enabled: parsed.charges_enabled,
    payouts_enabled: parsed.payouts_enabled,
    newStatus,
  })

  // Only write if something actually changed
  if (mentor.onboarding_status === newStatus) return

  const updates: {
    onboarding_status: OnboardingStatus
    verified?: boolean
    verified_at?: string
  } = { onboarding_status: newStatus }

  if (isNowVerified) {
    updates.verified = true
    updates.verified_at = new Date().toISOString()
  }

  await supabase.from('mentors').update(updates).eq('id', mentor.id)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[connect-webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 })
  }

  console.log('[connect-webhook] Received:', event.type, event.id)

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      default:
        console.log('[connect-webhook] Unhandled event type:', event.type)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[connect-webhook] Handler error for', event.type, ':', message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
