// lib/auth/tierGate.ts
// Tier and role access control helpers.
//
// Usage in Server Components:
//   const allowed = checkTierAccess(profile.tier, 'pro')
//   if (!allowed) return <UpgradePrompt feature="Live checklist" />
//
// Usage in API routes:
//   const allowed = checkTierAccess(profile.tier, 'pro')
//   if (!allowed) return NextResponse.json({ error: 'Pro required' }, { status: 403 })

import type { Tier, Role } from '@/lib/supabase/types'

// ─── Tier hierarchy ───────────────────────────────────────────────────────────
// Ordered lowest → highest. A higher-index tier always satisfies lower-index checks.

const TIER_ORDER: Tier[] = ['free', 'pro'] as const

/**
 * Returns true when `userTier` meets or exceeds `requiredTier`.
 *
 * Examples:
 *   checkTierAccess('pro',  'free') → true   (pro has everything free has)
 *   checkTierAccess('pro',  'pro')  → true
 *   checkTierAccess('free', 'pro')  → false
 *
 * Note: 'mentor_direct' is a Stripe subscription tier, not stored on profiles.
 * For mentor_direct feature access, use checkSubscriptionAccess() instead.
 */
export function checkTierAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier)
}

// ─── Role access ──────────────────────────────────────────────────────────────

const ROLE_ORDER: Role[] = ['trader', 'mentor', 'admin'] as const

/**
 * Returns true when `userRole` meets or exceeds `requiredRole`.
 *
 * Examples:
 *   checkRoleAccess('admin',  'mentor') → true
 *   checkRoleAccess('trader', 'mentor') → false
 */
export function checkRoleAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(requiredRole)
}

// ─── Feature map ──────────────────────────────────────────────────────────────
// Single source of truth for which features require which tier.
// Keeps the gating logic out of individual components.

export type GatedFeature =
  | 'live_checklist'
  | 'setup_grading'
  | 'trade_execution'
  | 'live_scanner'
  | 'setup_alerts'
  | 'journal_auto_tag'
  | 'psychology_insights'
  | 'exclusive_mentor_content'

const FEATURE_TIER: Record<GatedFeature, Tier> = {
  live_checklist:         'pro',
  setup_grading:          'pro',
  trade_execution:        'pro',
  live_scanner:           'pro',
  setup_alerts:           'pro',
  journal_auto_tag:       'pro',
  psychology_insights:    'pro',
  exclusive_mentor_content: 'pro', // mentor_direct at subscription level
}

/** Human-readable labels for each gated feature */
export const FEATURE_LABELS: Record<GatedFeature, string> = {
  live_checklist:          'Live auto-detecting checklist',
  setup_grading:           'Real-time setup grading (A+ to D+)',
  trade_execution:         'Psychology-gated trade execution',
  live_scanner:            'Live multi-mentor scanner',
  setup_alerts:            'A+ setup push alerts',
  journal_auto_tag:        'Auto-tagged trade journal',
  psychology_insights:     'Psychology pattern insights',
  exclusive_mentor_content: 'Exclusive mentor content',
}

/** Psychology-framed descriptions of why each feature matters */
export const FEATURE_PSYCHOLOGY: Record<GatedFeature, string> = {
  live_checklist:
    'Removes subjective interpretation — BOS either happened or it didn\'t.',
  setup_grading:
    'Gives you an objective score instead of asking "do I feel good about this?"',
  trade_execution:
    'Blocks trades below your grade threshold — stops FOMO and revenge entries.',
  live_scanner:
    'See all your mentors\' setups live. Walk away until conditions are met.',
  setup_alerts:
    'Stop chart staring. Get notified when an A+ setup forms and do something else.',
  journal_auto_tag:
    'Every trade auto-tagged with grade, mentor, and override status.',
  psychology_insights:
    'See exactly when and why your discipline breaks down — and fix it.',
  exclusive_mentor_content:
    'Premium strategy notes, live sessions, and direct feedback.',
}

/**
 * Check if a user tier grants access to a specific platform feature.
 *
 * Usage:
 *   if (!checkFeatureAccess(profile.tier, 'live_checklist')) { ... }
 */
export function checkFeatureAccess(userTier: Tier, feature: GatedFeature): boolean {
  return checkTierAccess(userTier, FEATURE_TIER[feature])
}

// ─── API guard ────────────────────────────────────────────────────────────────

/**
 * Returns an error payload for API routes when a feature is tier-gated.
 * Usage:
 *   if (!checkFeatureAccess(tier, 'trade_execution')) {
 *     return NextResponse.json(tierGateError('trade_execution'), { status: 403 })
 *   }
 */
export function tierGateError(feature: GatedFeature) {
  return {
    error: 'Upgrade required',
    feature,
    label: FEATURE_LABELS[feature],
    required_tier: FEATURE_TIER[feature],
    message: `${FEATURE_LABELS[feature]} requires a Pro subscription.`,
  }
}
