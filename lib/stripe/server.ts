// lib/stripe/server.ts
// Server-side Stripe SDK singleton + helper functions.
// Import ONLY in API routes and Server Actions — never in client components.
//
// Helpers:
//   createCheckoutSession  — initiates Pro or Mentor Direct checkout
//   createPortalSession    — opens Stripe Customer Portal (manage/cancel subscription)
//   createConnectAccountLink — onboards a mentor to Stripe Connect Express

import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { PRICES } from './prices'

// ─── Singleton ────────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null

function getStripeServer(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  }
  return _stripe
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeServer() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ─── createCheckoutSession ────────────────────────────────────────────────────

interface CheckoutParams {
  /** Supabase user ID (stored as client_reference_id so we can look it up in webhooks) */
  userId: string
  /** Stripe Price ID — use PRICES.PRO_MONTHLY or PRICES.MENTOR_DIRECT_MONTHLY */
  priceId: string
  /** Required for mentor_direct subscriptions — the mentor being subscribed to */
  mentorId?: string
}

/**
 * Creates a Stripe Checkout Session for Pro or Mentor Direct.
 * Automatically retrieves or creates the Stripe Customer for this user.
 */
export async function createCheckoutSession({
  userId,
  priceId,
  mentorId,
}: CheckoutParams): Promise<Stripe.Checkout.Session> {
  const supabase = createServiceClient()

  // Retrieve or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, display_name')
    .eq('id', userId)
    .single()

  let customerId = profile?.stripe_customer_id ?? undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { supabase_user_id: userId },
      ...(profile?.display_name ? { name: profile.display_name } : {}),
    })
    customerId = customer.id

    // Persist the customer ID so future sessions skip customer creation
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Pass mentor_id through metadata so the webhook can link the subscription
    metadata: mentorId ? { mentor_id: mentorId } : {},
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: mentorId ? { mentor_id: mentorId } : {},
    },
  })

  return session
}

// ─── createPortalSession ──────────────────────────────────────────────────────

/**
 * Creates a Stripe Customer Portal session so a user can manage/cancel their subscription.
 */
export async function createPortalSession(
  customerId: string,
): Promise<Stripe.BillingPortal.Session> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/accounts`,
  })
}

// ─── createConnectAccountLink ─────────────────────────────────────────────────

/**
 * Creates a Stripe Connect Express onboarding link for a mentor.
 * Creates the Connect account if it doesn't already exist, then stores the
 * stripe_connect_id on the mentor row.
 */
export async function createConnectAccountLink(
  mentorId: string,
): Promise<string> {
  const supabase = createServiceClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playbuuk.com'

  // Fetch mentor to check for an existing Connect account
  const { data: mentor } = await supabase
    .from('mentors')
    .select('stripe_connect_id, display_name, contact_info')
    .eq('id', mentorId)
    .single()

  let connectId = mentor?.stripe_connect_id ?? undefined

  if (!connectId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: { interval: 'monthly', monthly_anchor: 5 },
          debit_negative_balances: false,
        },
      },
      metadata: { playbuuk_mentor_id: mentorId },
    })
    connectId = account.id

    // Persist the Connect account ID
    await supabase
      .from('mentors')
      .update({ stripe_connect_id: connectId })
      .eq('id', mentorId)
  }

  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${baseUrl}/portal/settings?connect=refresh`,
    return_url: `${baseUrl}/portal/settings?connect=success`,
    type: 'account_onboarding',
  })

  return accountLink.url
}
