// lib/stripe/client.ts
// Stripe.js browser client — import only in client components.
// Usage:
//   import { getStripe } from '@/lib/stripe/client'
//   const stripe = await getStripe()
//   await stripe.redirectToCheckout({ sessionId })

import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    )
  }
  return stripePromise
}
