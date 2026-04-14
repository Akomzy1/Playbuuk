// components/ui/pro-badge.tsx
// Small inline badge displayed next to feature names that require Pro.
// Designed to sit inside headings, list items, and nav labels without
// disrupting the reading flow.
//
// Usage:
//   <ProBadge />                        — default (sm)
//   <ProBadge size="xs" />              — for tight spaces (e.g. sidebar labels)
//   <ProBadge size="md" />              — for card headers
//   <ProBadge label="Pro Only" />       — custom label
//   <ProBadge icon={false} />           — text-only (no sparkle icon)

import { Sparkles } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProBadgeProps {
  size?: 'xs' | 'sm' | 'md'
  label?: string
  /** Show the Sparkles icon (default: true) */
  icon?: boolean
  className?: string
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE = {
  xs: { padding: 'px-1.5 py-px',  text: 'text-[9px]', icon: 8,  gap: 'gap-0.5' },
  sm: { padding: 'px-2 py-0.5',   text: 'text-2xs',   icon: 9,  gap: 'gap-1' },
  md: { padding: 'px-2.5 py-0.5', text: 'text-xs',    icon: 10, gap: 'gap-1' },
} as const

// ─── ProBadge ─────────────────────────────────────────────────────────────────

export function ProBadge({
  size = 'sm',
  label = 'PRO',
  icon = true,
  className = '',
}: ProBadgeProps) {
  const s = SIZE[size]

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-bold font-mono uppercase tracking-wide leading-none select-none',
        s.padding,
        s.text,
        s.gap,
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: 'rgba(0,229,176,0.1)',
        border: '1px solid rgba(0,229,176,0.25)',
        color: 'var(--accent)',
      }}
      aria-label={`Requires Pro subscription`}
      title="Requires Playbuuk Pro"
    >
      {icon && <Sparkles size={s.icon} aria-hidden="true" className="flex-shrink-0" />}
      {label}
    </span>
  )
}
