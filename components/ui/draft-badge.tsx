// components/ui/draft-badge.tsx
// Muted grey badge shown on AI-extracted mentor profiles and playbooks
// that have not yet been reviewed and approved by the real mentor.
//
// Usage:
//   <DraftBadge />                      — default (md)
//   <DraftBadge size="sm" />
//   <DraftBadge size="lg" showIcon />

import { Bot } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  /** Show the Bot icon alongside the label (default: true) */
  showIcon?: boolean
  className?: string
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE = {
  sm: { padding: 'px-2 py-0.5',   text: 'text-2xs', icon: 9,  gap: 'gap-1' },
  md: { padding: 'px-2.5 py-1',   text: 'text-xs',  icon: 11, gap: 'gap-1.5' },
  lg: { padding: 'px-3 py-1.5',   text: 'text-sm',  icon: 13, gap: 'gap-2' },
} as const

// ─── DraftBadge ───────────────────────────────────────────────────────────────

export function DraftBadge({ size = 'md', showIcon = true, className = '' }: DraftBadgeProps) {
  const s = SIZE[size]

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-mono select-none',
        s.padding,
        s.text,
        s.gap,
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: 'rgba(107,127,163,0.08)',
        border: '1px solid rgba(107,127,163,0.22)',
        color: 'var(--dim)',
      }}
      title="AI-extracted playbook — pending mentor review"
    >
      {showIcon && <Bot size={s.icon} aria-hidden="true" className="flex-shrink-0 opacity-70" />}
      <span>AI-Extracted Draft — Pending Mentor Review</span>
    </span>
  )
}
