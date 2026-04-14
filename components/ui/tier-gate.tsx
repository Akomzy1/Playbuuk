// components/ui/tier-gate.tsx
// Wrapper that visually gates any content block behind a tier check.
//
// ┌─ How it works ──────────────────────────────────────────────────────────┐
// │  hasAccess = checkTierAccess(userTier, requiredTier)                    │
// │                                                                          │
// │  TRUE  → children rendered normally                                     │
// │  FALSE → children rendered with filter:blur(8px) + pointer-events:none │
// │          overlaid with an UpgradePrompt card                            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// This is a VISUAL gate — the actual data protection is enforced at the
// API and SSR layers. TierGate's job is UX: show the shape of the content,
// make the upgrade path immediately obvious.
//
// Server component — no interactivity needed, so no 'use client' required.
// Children may be client or server components.
//
// Usage:
//   <TierGate requiredTier="pro" userTier={userTier} feature="live_checklist">
//     <LiveChecklist checklist={checklist} />
//   </TierGate>
//
//   <TierGate
//     requiredTier="pro"
//     userTier={userTier}
//     feature="setup_grading"
//     headline="See your setup grade live"
//     compact={false}
//   >
//     <SetupGrade ... />
//   </TierGate>

import type { ReactNode } from 'react'
import { checkTierAccess, type GatedFeature } from '@/lib/auth/tierGate'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import type { Tier } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TierGateProps {
  /** Minimum tier required to see the children un-gated */
  requiredTier: Tier
  /** The current user's tier — computed server-side and passed as a prop */
  userTier: Tier
  /** Which feature is being gated — drives the UpgradePrompt copy */
  feature: GatedFeature
  /** Override the UpgradePrompt headline */
  headline?: string
  /**
   * compact = true  → small inline UpgradePrompt bar (default inside TierGate)
   * compact = false → full centred card (use for primary gate on a page)
   */
  compact?: boolean
  children: ReactNode
}

// ─── TierGate ────────────────────────────────────────────────────────────────

export function TierGate({
  requiredTier,
  userTier,
  feature,
  headline,
  compact = true,
  children,
}: TierGateProps) {
  const hasAccess = checkTierAccess(userTier, requiredTier)

  // ── Unlocked: render children as-is ───────────────────────────────────────
  if (hasAccess) return <>{children}</>

  // ── Locked: blur + overlay ─────────────────────────────────────────────────
  return (
    <div className="relative isolate">
      {/*
        Blurred preview — still in DOM so it shows the *shape* of the content
        behind the gate, which motivates the upgrade.
        aria-hidden: screen readers skip this since it's inaccessible anyway.
        pointer-events: none prevents any accidental clicks through the blur.
      */}
      <div
        style={{
          filter: 'blur(8px)',
          opacity: 0.45,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/*
        Overlay — sits on top of the blurred preview.
        backdrop-filter adds a second layer of blur to soften hard edges at
        the overlay boundary. The dark background ensures the UpgradePrompt
        reads clearly regardless of the content behind it.
      */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(5,8,16,0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        role="region"
        aria-label={`Upgrade required to access this feature`}
      >
        <div
          className={[
            'w-full',
            compact ? 'px-4 max-w-sm' : 'px-6 max-w-lg',
          ].join(' ')}
        >
          <UpgradePrompt
            feature={feature}
            headline={headline}
            compact={compact}
          />
        </div>
      </div>
    </div>
  )
}
