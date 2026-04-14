// components/ui/verified-badge.tsx
// Green "✓ Verified Partner" badge with a periodic shine sweep animation.
//
// The shine uses the existing `animate-shimmer` keyframe (background-position
// -200% → 200%) overlaid as a translucent gradient on the badge surface.
// The animation fires on a 5s interval so it's noticeable but not distracting.
//
// Usage:
//   <VerifiedBadge />                   — default (md)
//   <VerifiedBadge size="sm" />
//   <VerifiedBadge size="lg" pulse />    — adds glow pulse animation

import { CheckCircle2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  /** Adds a subtle glow pulse on top of the shine sweep */
  pulse?: boolean
  className?: string
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE = {
  sm: {
    padding:   'px-2 py-0.5',
    text:      'text-2xs',
    icon:      10,
    gap:       'gap-1',
  },
  md: {
    padding:   'px-2.5 py-1',
    text:      'text-xs',
    icon:      12,
    gap:       'gap-1.5',
  },
  lg: {
    padding:   'px-3 py-1.5',
    text:      'text-sm',
    icon:      14,
    gap:       'gap-2',
  },
} as const

// ─── VerifiedBadge ────────────────────────────────────────────────────────────

export function VerifiedBadge({ size = 'md', pulse = false, className = '' }: VerifiedBadgeProps) {
  const s = SIZE[size]

  return (
    <span
      className={[
        'relative inline-flex items-center font-bold font-mono overflow-hidden rounded-full select-none',
        s.padding,
        s.text,
        s.gap,
        pulse ? 'animate-pulse-subtle' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: 'rgba(0,229,176,0.1)',
        border: '1px solid rgba(0,229,176,0.35)',
        color: 'var(--accent)',
        // Slow down the glow pulse for this specific use
        animationDuration: pulse ? '3s' : undefined,
      }}
      aria-label="Verified Partner"
    >
      <CheckCircle2 size={s.icon} aria-hidden="true" className="flex-shrink-0" />
      <span>✓ Verified Partner</span>

      {/* ── Shine sweep ──────────────────────────────────────────────────── */}
      {/* Uses the shimmer keyframe already in tailwind.config.ts            */}
      {/* Slowed to 5s so it reads as a quality indicator, not a loader      */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 5s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
    </span>
  )
}
