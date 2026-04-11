// lib/stripe/prices.ts
// Canonical Stripe price ID constants.
// All Stripe checkout and subscription logic must reference these — never hardcode IDs.
//
// Price tiers (from CLAUDE.md):
//   Pro monthly       — $19.99/month — full discipline engine for ALL followed mentors
//   Mentor Direct     — $9.99/month per mentor — exclusive content for one specific mentor
//
// IDs are read from env so staging and production can use different Stripe accounts
// without a code change.  The fallback empty strings will cause a clear Stripe error
// rather than a silent no-op if the env vars are missing.

export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  MENTOR_DIRECT_MONTHLY: process.env.STRIPE_PRICE_MENTOR_DIRECT_MONTHLY ?? '',
} as const

export type PriceId = (typeof PRICES)[keyof typeof PRICES]
