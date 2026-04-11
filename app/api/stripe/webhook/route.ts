// app/api/stripe/webhook/route.ts
// Stripe subscription webhook handler.
//
// Events handled:
//   checkout.session.completed       → create subscription row, upgrade profile tier
//   customer.subscription.updated    → sync status/tier changes (upgrades, renewals)
//   customer.subscription.deleted    → downgrade to free
//   invoice.payment_failed           → mark subscription past_due
//
// IMPORTANT: This route must NOT use any auth middleware — Stripe sends unsigned
// POST requests. Signature verification via stripe.webhooks.constructEvent() is
// the only security layer needed.
//
// The route opts out of body parsing (bodyParser: false) by consuming the raw
// stream — this is required for Stripe signature verification.

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { SubscriptionStatus, SubscriptionTier, Tier } from '@/lib/supabase/types'

// ─── Stripe → Supabase status mapping ────────────────────────────────────────

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  trialing: 'active',
  unpaid: 'past_due',
  paused: 'past_due',
}

// ─── Price ID → Tier mapping ──────────────────────────────────────────────────

function tierFromPriceId(priceId: string): SubscriptionTier {
  const proId = process.env.STRIPE_PRICE_PRO_MONTHLY
  const directId = process.env.STRIPE_PRICE_MENTOR_DIRECT_MONTHLY
  if (priceId === proId) return 'pro'
  if (priceId === directId) return 'mentor_direct'
  return 'free'
}

// profile.tier is the simpler free/pro enum — mentor_direct counts as pro
function profileTierFromSubscriptionTier(tier: SubscriptionTier): Tier {
  return tier === 'free' ? 'free' : 'pro'
}

// ─── Zod schemas for the objects we extract from webhook payloads ─────────────
// We don't validate the full Stripe payload (Stripe owns the shape) — we validate
// the specific fields we actually read so we fail fast with clear errors.

const CheckoutSessionSchema = z.object({
  id: z.string(),
  client_reference_id: z.string().nullable(),
  customer: z.string().nullable(),
  subscription: z.string().nullable(),
  metadata: z.record(z.string(), z.string()).default({}),
})

const SubscriptionSchema = z.object({
  id: z.string(),
  customer: z.string(),
  status: z.string(),
  metadata: z.record(z.string(), z.string()).default({}),
  items: z.object({
    data: z.array(
      z.object({
        price: z.object({ id: z.string() }),
      }),
    ),
  }),
  current_period_start: z.number(),
  current_period_end: z.number(),
})

const InvoiceSchema = z.object({
  id: z.string(),
  customer: z.string(),
  subscription: z.string().nullable(),
})

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function getUserIdByCustomerId(
  customerId: string,
): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const parsed = CheckoutSessionSchema.parse(session)
  const supabase = createAdminClient()

  // client_reference_id is set to userId in createCheckoutSession()
  const userId = parsed.client_reference_id
  if (!userId) {
    console.warn('[webhook] checkout.session.completed: missing client_reference_id', { sessionId: parsed.id })
    return
  }

  const subscriptionId = parsed.subscription
  if (!subscriptionId) {
    console.warn('[webhook] checkout.session.completed: no subscription on session', { sessionId: parsed.id })
    return
  }

  // Fetch the full subscription to get price details
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const parsedSub = SubscriptionSchema.parse(sub)
  const priceId = parsedSub.items.data[0]?.price.id ?? ''
  const tier = tierFromPriceId(priceId)
  const mentorId = parsedSub.metadata['mentor_id'] ?? parsed.metadata['mentor_id'] ?? null
  const status: SubscriptionStatus = STRIPE_STATUS_MAP[parsedSub.status] ?? 'active'

  console.log('[webhook] checkout.session.completed', { userId, tier, subscriptionId, status })

  // Upsert subscription row
  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      mentor_id: mentorId ?? null,
      stripe_subscription_id: subscriptionId,
      status,
      period_start: new Date(parsedSub.current_period_start * 1000).toISOString(),
      period_end: new Date(parsedSub.current_period_end * 1000).toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  )

  // Upgrade profile tier
  await supabase
    .from('profiles')
    .update({ tier: profileTierFromSubscriptionTier(tier) })
    .eq('id', userId)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const parsed = SubscriptionSchema.parse(sub)
  const supabase = createAdminClient()

  const userId = await getUserIdByCustomerId(parsed.customer)
  if (!userId) {
    console.warn('[webhook] subscription.updated: no user for customer', { customer: parsed.customer })
    return
  }

  const priceId = parsed.items.data[0]?.price.id ?? ''
  const tier = tierFromPriceId(priceId)
  const mentorId = parsed.metadata['mentor_id'] ?? null
  const status: SubscriptionStatus = STRIPE_STATUS_MAP[parsed.status] ?? 'active'

  console.log('[webhook] customer.subscription.updated', { userId, tier, status, subscriptionId: parsed.id })

  // Sync the subscription row
  await supabase
    .from('subscriptions')
    .update({
      tier,
      mentor_id: mentorId,
      status,
      period_start: new Date(parsed.current_period_start * 1000).toISOString(),
      period_end: new Date(parsed.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', parsed.id)

  // Sync profile tier
  await supabase
    .from('profiles')
    .update({ tier: profileTierFromSubscriptionTier(tier) })
    .eq('id', userId)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const parsed = SubscriptionSchema.parse(sub)
  const supabase = createAdminClient()

  const userId = await getUserIdByCustomerId(parsed.customer)
  if (!userId) {
    console.warn('[webhook] subscription.deleted: no user for customer', { customer: parsed.customer })
    return
  }

  console.log('[webhook] customer.subscription.deleted', { userId, subscriptionId: parsed.id })

  // Mark subscription canceled
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', tier: 'free' })
    .eq('stripe_subscription_id', parsed.id)

  // Downgrade profile to free — only if no other active subscriptions remain
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!activeSubs || activeSubs.length === 0) {
    await supabase.from('profiles').update({ tier: 'free' }).eq('id', userId)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const parsed = InvoiceSchema.parse(invoice)
  const supabase = createAdminClient()

  if (!parsed.subscription) return

  console.log('[webhook] invoice.payment_failed', {
    customer: parsed.customer,
    invoiceId: parsed.id,
    subscriptionId: parsed.subscription,
  })

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', parsed.subscription)
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 })
  }

  console.log('[webhook] Received:', event.type, event.id)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Acknowledge unhandled events — Stripe will retry if we return non-2xx
        console.log('[webhook] Unhandled event type:', event.type)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Handler error for', event.type, ':', message)
    // Return 500 so Stripe retries — only for unexpected failures, not known no-ops
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
