// app/api/stripe/connect/route.ts
// Dual-purpose Stripe Connect route:
//
// POST — no stripe-signature header (mentor-initiated):
//   Requires authenticated mentor/admin. Creates or retrieves a Stripe Connect
//   Express account for the caller's mentor record, then returns an onboarding
//   link. The frontend redirects to this URL.
//
//   Request body: {} (empty or omitted)
//   Response:     { url: string }              — redirect to Stripe onboarding
//   Errors:       401, 403, 404, 500
//
// POST — stripe-signature header present (Stripe webhook):
//   Verifies webhook signature, then handles:
//     account.updated → syncs mentor verification status and verified flag
//   Register this endpoint in Stripe Dashboard → Connect → Webhooks.
//   Use STRIPE_CONNECT_WEBHOOK_SECRET (separate from main subscription secret).
//
// Notes:
//   - stripe_connect_id is stored on the mentor row after account creation
//   - verified/verified_at are set when charges_enabled + payouts_enabled both true
//   - onboarding_status transitions: admin_added → invitation_sent → under_review → verified

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { stripe, createConnectAccountLink } from '@/lib/stripe/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRoleAccess } from '@/lib/auth/tierGate'
import type { OnboardingStatus } from '@/lib/supabase/types'

// ─── Webhook: Zod schema for fields we read from account.updated ──────────────

const AccountSchema = z.object({
  id: z.string(),
  charges_enabled: z.boolean(),
  payouts_enabled: z.boolean(),
  details_submitted: z.boolean(),
})

// ─── Webhook: derive onboarding_status from Connect account state ─────────────

function onboardingStatusFromAccount(
  account: z.infer<typeof AccountSchema>,
): OnboardingStatus {
  if (account.charges_enabled && account.payouts_enabled) return 'verified'
  if (account.details_submitted) return 'under_review'
  return 'invitation_sent'
}

// ─── Webhook: handle account.updated ─────────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account) {
  const parsed = AccountSchema.parse(account)
  const supabase = createAdminClient()

  const { data: mentor } = await supabase
    .from('mentors')
    .select('id, onboarding_status')
    .eq('stripe_connect_id', parsed.id)
    .maybeSingle()

  if (!mentor) {
    // Connect account not yet linked — may arrive before our DB write in rare race
    console.warn('[connect-webhook] account.updated: no mentor for connect_id', parsed.id)
    return
  }

  const newStatus = onboardingStatusFromAccount(parsed)

  console.log('[connect-webhook] account.updated', {
    mentorId: mentor.id,
    connectId: parsed.id,
    charges_enabled: parsed.charges_enabled,
    payouts_enabled: parsed.payouts_enabled,
    newStatus,
  })

  // Skip write if nothing changed
  if (mentor.onboarding_status === newStatus) return

  const updates: {
    onboarding_status: OnboardingStatus
    verified?: boolean
    verified_at?: string
  } = { onboarding_status: newStatus }

  if (newStatus === 'verified') {
    updates.verified = true
    updates.verified_at = new Date().toISOString()
  }

  const { error } = await supabase.from('mentors').update(updates).eq('id', mentor.id)
  if (error) {
    console.error('[connect-webhook] failed to update mentor:', error.message)
    throw new Error(error.message)
  }
}

// ─── Onboarding handler (mentor-initiated) ────────────────────────────────────

async function handleOnboardingRequest(
  _request: NextRequest,
): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Verify the caller has mentor or admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !checkRoleAccess(profile.role, 'mentor')) {
    return NextResponse.json({ error: 'Forbidden — mentor role required' }, { status: 403 })
  }

  // Find the mentor row linked to this user
  const { data: mentor } = await supabase
    .from('mentors')
    .select('id, stripe_connect_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mentor) {
    return NextResponse.json(
      { error: 'No mentor profile found for this account' },
      { status: 404 },
    )
  }

  try {
    const url = await createConnectAccountLink(mentor.id)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[connect] createConnectAccountLink error:', message)
    return NextResponse.json({ error: 'Failed to create Connect account link' }, { status: 500 })
  }
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

async function handleWebhookRequest(
  request: NextRequest,
  signature: string,
): Promise<NextResponse> {
  const rawBody = await request.text()

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

// ─── Unified POST handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')

  // Stripe webhooks always include the stripe-signature header
  if (signature) {
    return handleWebhookRequest(request, signature)
  }

  // Mentor-initiated: create/refresh Connect onboarding link
  return handleOnboardingRequest(request)
}
